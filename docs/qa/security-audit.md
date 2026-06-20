# Security Audit — IWS API

**Date:** 2026-06-19
**Scope:** `apps/api/src` (all domain modules) + auth primitives (`apps/api/src/auth`, `packages/auth`)
**Type:** Read-only static security review. No files modified.
**Method:** Full read of auth/scope primitives, config, exception filter, Prisma schema; grep sweeps for scope-bypass patterns, raw SQL, ledger mutations, env leaks; module-by-module review of every controller + service + DTO. All agent-surfaced findings were re-verified against source before inclusion and severities re-calibrated.

---

## Executive Summary

The backend is in good security shape. The two-layer authorization model (role + warehouse scope) is consistently applied, the stock-mutation invariant (every quantity change funnels through `applyMovement`, writing a `StockMovement` + `ActivityLog` in the same transaction) holds throughout, ledgers are append-only, secrets are env-only and validated at boot, and the global exception filter prevents internal/stack-trace leakage. **The recently-fixed scope key-collision bug class is fully eradicated** — every warehouse-bound query either uses `AND: [warehouseFilter(...), ...]` or spreads `warehouseFilter` only with non-warehouse keys. No raw SQL, no ledger updates/deletes, no `Float` on money/qty, no privilege-escalation path via self-registration.

The findings below are mostly hardening items. There are **no Critical** issues. The most actionable are an authenticated CSV/formula-injection vector (Medium), a deactivated-user-can-still-refresh gap (Medium), and missing transport hardening (rate-limit/helmet/body-limit) expected for local dev but worth tracking.

### Counts by severity

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 0 |
| Medium | 5 |
| Low | 5 |
| Informational | 3 |

### Remediation status (applied 2026-06-19, same day)

| # | Finding | Status |
|---|---|---|
| M1 | CSV/formula injection in report export | ✅ **Fixed** — `toCsv` prefixes cells starting with `= + - @ \t \r` with `'`; unit-tested (`reports.service.spec.ts`). |
| M2 | Deactivated user could keep refreshing tokens | ✅ **Fixed** — `refresh()` rejects non-`ACTIVE` users; `users.deactivate` clears `hashedRefreshToken`; e2e regression added. |
| M3 | Access token carries `role`, no per-request DB lookup (≤15-min staleness) | 📝 **Accepted/documented** — standard stateless-JWT tradeoff; mitigated by the 15-min access TTL + M2 (refresh re-checks status). Revisit only if instant revocation is required. |
| M4 | No rate limiting on `/auth/login` | ✅ **Fixed** — added `@nestjs/throttler`: generous global per-route limit + strict **10/min/IP** on `login`+`register` (raised under test). |
| M5 | Timing-based user enumeration on login | ✅ **Fixed** — `login` always runs a bcrypt compare (dummy hash when email unknown); generic 401. |
| L1 | Goods-receipt read returned 403 (existence leak) out-of-scope | ✅ **Fixed** — `getReceipt` returns 404 for out-of-scope. |
| L2–L5, Info | supplier-lookup / low-stock 2nd pass / staff-request-transfer / body-limit / helmet | 📝 Reviewed — no data leak; body-limit + helmet tracked as release hardening (local-dev acceptable). |

Post-remediation gate: typecheck ✓, lint ✓, unit **106** ✓, e2e **119** ✓, build ✓.

> Note on calibration: the parallel review agents initially flagged three items as "Critical" (suppliers missing `ScopeGuard`, goods-receipt IDOR, AI `generatePo` scope escape) and one as "Critical CSV RCE". On direct verification, none are Critical — suppliers are global reference data by design, the receipt path does not leak data (only an inconsistent status code), the AI supplier lookup leaks no scoped data (suppliers are global), and CSV injection requires a victim to open the file in a spreadsheet app. They are recorded below at their true severities.

---

## Findings — Medium

### M1 — CSV / formula injection in report export
**File:** `apps/api/src/reports/reports.service.ts:223-233` (`toCsv`)

`esc()` correctly handles RFC-4180 quoting (`"`, `,`, newline) but does **not** neutralize spreadsheet formula triggers. A cell whose value begins with `=`, `+`, `-`, `@`, tab (`\t`) or CR (`\r`) is interpreted as a live formula when the exported CSV is opened in Excel / Google Sheets / LibreOffice. The cell values are user-controlled: product names, SKUs, warehouse names all flow into reports, and any authenticated writer (manager/admin) can set them — e.g. a product named `=cmd|'/c calc'!A1` or `@SUM(...)`.

```ts
const esc = (v) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; // no formula guard
};
```

**Severity:** Medium (authenticated, requires victim to open the file in a spreadsheet app; not RCE on the server).
**Fix:** Prefix any value starting with a formula trigger with a single quote (and still apply the existing quoting):
```ts
const esc = (v) => {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
```

### M2 — Deactivated user can keep minting tokens via `/auth/refresh`
**File:** `apps/api/src/auth/auth.service.ts:52-70` (`refresh`)

`login()` correctly blocks `PENDING_APPROVAL` (403) and any non-`ACTIVE` status (generic 401). But `refresh()` only checks that a stored `hashedRefreshToken` exists and matches — it never re-checks `user.status`. A user who was `ACTIVE` at login and is later **deactivated** (`DELETE /users/:id` → `INACTIVE`) keeps a valid refresh token and can rotate it indefinitely, and each rotation yields a fresh 15-minute access token. Deactivation therefore does not actually cut off access until the refresh token's 7-day TTL expires (or an admin/logout clears the hash, which deactivation does not do).

**Severity:** Medium (account lifecycle / revocation gap; bounded by 7-day TTL).
**Fix:** In `refresh()`, after loading the user, reject if `user.status !== UserStatus.ACTIVE` (mirror the login check), and clear `hashedRefreshToken` on deactivate in `UsersService.deactivate`.

### M3 — Access token carries `role`; no per-request freshness check
**Files:** `apps/api/src/auth/auth.types.ts:4-8`, `apps/api/src/auth/strategies/access.strategy.ts:17-19`

The JWT payload embeds `role`, and `AccessStrategy.validate` returns the decoded payload verbatim with no DB lookup. `RolesGuard` then gates on that token-embedded role. Consequence: if an admin **changes a user's role** (e.g. demotes a manager to staff), or **deactivates** them, the change has no effect until the 15-minute access token expires — the user keeps acting at their old role/active state for up to 15 minutes. Scope is resolved live from the DB per request (good), but role and active-state are stale-until-expiry.

**Severity:** Medium (privilege changes not effective until token expiry; 15-minute window).
**Fix:** Acceptable for short-lived access tokens if documented, but the safer pattern is a lightweight per-request user lookup in `AccessStrategy.validate` (or a guard) to confirm `status === ACTIVE` and read the current role, rejecting otherwise. At minimum, pair with M2 so refresh can't extend a stale role.

### M4 — No rate limiting / brute-force protection on `/auth/login`
**Files:** `apps/api/package.json` (no `@nestjs/throttler`), `apps/api/src/app.setup.ts`

There is no throttling anywhere. `/auth/login` and `/auth/register` accept unlimited attempts, enabling password brute-force and registration/email-enumeration spam. (Expected for local dev, but a release blocker.)

**Severity:** Medium (expected for local dev; must be addressed before any non-local deployment).
**Fix:** Add `@nestjs/throttler` with a strict limit on auth routes (e.g. 5–10/min/IP) and a global default.

### M5 — Login is vulnerable to timing-based user enumeration
**File:** `apps/api/src/auth/auth.service.ts:25-32`

```ts
const user = await this.prisma.user.findUnique({ where: { email } });
const credentialsValid = !!user && (await this.passwords.compare(password, user.passwordHash));
```

When `email` does not exist, `user` is falsy and the `&&` short-circuits — `bcrypt.compare` (deliberately slow) is **never** run. When the email exists, the bcrypt hash *is* computed. The measurable latency difference lets an attacker enumerate valid accounts despite the (correct) generic "Invalid credentials" message. Note the response message handling itself is correct — this is purely the timing side-channel.

**Severity:** Medium (user enumeration via timing).
**Fix:** Always perform a bcrypt comparison against a fixed dummy hash when the user is absent, so both paths cost the same.

---

## Findings — Low

### L1 — Goods-receipt read asserts scope after fetch → 403 leaks existence
**File:** `apps/api/src/purchase-orders/purchase-orders.service.ts:482-500` (`getReceipt`)

Unlike every other by-id lookup in the codebase (which use `findFirst({ where: { AND: [{ id }, warehouseFilter(...)] } })` → uniform 404), `getReceipt` does `findUnique({ where: { id } })` and then calls `assertWarehouseInScope`, which throws **403 "Warehouse outside your scope"** for an out-of-scope-but-existing receipt vs **404** for a non-existent one. The receipt body is *not* returned (the assert throws first), so this is not data disclosure — but the differing status code lets a caller distinguish "exists, not yours" from "does not exist", leaking existence of out-of-scope receipts.

**Severity:** Low (existence oracle; no data returned).
**Fix:** Match the project's standard pattern — load with `findFirst({ where: { AND: [{ id: receiptId }, warehouseFilter(scope, 'warehouseId')] }, ... })` and throw 404 if null. The controller already documents the response as "Not found or out of scope."

### L2 — AI `generatePo` derives supplier/cost from a cross-scope PO lookup
**File:** `apps/api/src/ai/ai.service.ts:299-310`

The reorder `suggestions` are correctly scope-filtered, and the created draft PO uses the in-scope `s.warehouseId`. However, the `lastPo` lookup that supplies the draft's `supplierId` and `unitCost` queries `purchaseOrder.findFirst({ where: { lines: { some: { productId } } } })` with **no scope filter** — it picks the most recent PO for that product *anywhere*. This is **not** a scope escape (the PO is still created for the in-scope warehouse), and suppliers are global reference data, so the leaked datum is a unit-cost figure from another warehouse's PO seeding a draft. Minor data-provenance leak only.

**Severity:** Low (no scoped data escapes; suppliers are global; draft is human-reviewed before send).
**Fix (defense-in-depth):** Constrain the lookup to scope: `where: { AND: [warehouseFilter(scope, 'warehouseId'), { lines: { some: { productId: s.productId } } }] }`.

### L3 — Low-stock inventory page query drops the scope filter on the second pass
**File:** `apps/api/src/inventory/inventory.service.ts:256-259`

The low-stock branch resolves candidate ids from a scope-filtered query, slices a page of ids, then re-fetches with `where: { id: { in: pageIds } }` — no scope filter on the re-fetch. It is **functionally safe today** because `pageIds` derive only from the scope-filtered candidate set, but it is a defense-in-depth weakness: a future refactor of the id-gathering step could silently widen exposure.

**Severity:** Low (currently safe; fragile).
**Fix:** Add `AND: [warehouseFilter(scope, 'warehouseId'), { id: { in: pageIds } }]` to the re-fetch.

### L4 — Staff role may *request* stock transfers
**File:** `apps/api/src/transfers/transfers.controller.ts:79-93`

`POST /transfers` (request transfer: source Available → In-Transit) is gated `@Roles(SUPER_ADMIN, WAREHOUSE_MANAGER, STAFF)`. The authorization rule lists Staff capabilities as "receive, dispatch, count, view." Whether a transfer-out counts as "dispatch" is ambiguous. Risk is bounded: the source warehouse is asserted in the caller's scope, and the `approve` step (which actually commits the hold) is correctly manager/admin-only. So a staffer can only *propose* a transfer from their own warehouse, pending manager approval.

**Severity:** Low (bounded by scope + manager approval gate; needs a product/role-matrix decision).
**Fix:** If transfers are a manager action, drop `Role.STAFF` from line 80. Otherwise document that "dispatch" includes transfer requests.

### L5 — No request body size limit
**File:** `apps/api/src/app.setup.ts`, `apps/api/src/main.ts`

No explicit body-parser size cap is configured; Nest/Express defaults (~100 kb JSON) apply. Endpoints accepting arrays (PO lines, count lines, assign-warehouses) could be sent large payloads. Low risk at the default, but worth pinning an explicit limit.

**Severity:** Low.
**Fix:** Set an explicit `bodyParser` limit (e.g. `{ limit: '256kb' }`) in `configureApp`.

---

## Informational / by-design (raised by review, not defects)

- **I1 — Suppliers controller has no `ScopeGuard`** (`apps/api/src/suppliers/suppliers.controller.ts:43`). By design: suppliers are **global reference data** (CLAUDE.md / data model — no warehouse scope on `Supplier`). Writes are role-gated (`SUPER_ADMIN`, `WAREHOUSE_MANAGER`); reads are catalog-global. Not a finding. Recommend a one-line comment documenting the intentional exemption.
- **I2 — Notifications controller has `JwtAccessGuard` only, no `RolesGuard`** (`apps/api/src/notifications/notifications.controller.ts:29`). Correct: notifications are per-user, and the service scopes every query by `user.sub` (`listForUser` filters `{ userId }`; `markRead` uses `updateMany({ where: { id, userId } })` → foreign id matches 0 rows → 404). No IDOR. A `RolesGuard` would be redundant since all authenticated users may read their own notifications.
- **I3 — `UpdateProductDto.status` is client-settable** (`apps/api/src/products/dto/update-product.dto.ts:7-16`). Acceptable: the route is `@Roles(SUPER_ADMIN, WAREHOUSE_MANAGER)`, the value is `@IsEnum`-validated, and archiving via PATCH is a legitimate manager action. Note only.

---

## Verified-correct (positive findings)

**Authentication**
- Passwords hashed with bcrypt (`bcryptjs`, 10 rounds) — `password.service.ts`. (Project doc mentions argon2/bcrypt; bcrypt is acceptable.)
- Refresh tokens are **hashed at rest** and rotated on every `refresh` — `auth.service.ts:48,68,93-99`. Logout nulls the stored hash (`logout`, line 72-77).
- JWT secrets read via `ConfigService.getOrThrow` (fail-closed) with distinct access/refresh secrets and explicit TTLs (15m / 7d). Strategies set `ignoreExpiration: false`.
- Login returns a uniform generic 401 for unknown email, wrong password, and non-active accounts; only a fully-valid credential pair learns the `PENDING_APPROVAL` state (403) — no enumeration via *message* (timing aside, see M5). `auth.service.ts:25-42`.
- **Self-registration cannot escalate or log in early**: `RegisterDto` accepts only name/email/password; `registerSelfSignup` hardcodes `role: STAFF`, `status: PENDING_APPROVAL` and ignores any client role/scope; login blocks `PENDING_APPROVAL`. `users.service.ts:36-44`, `register.dto.ts`.

**Authorization (two-layer role + scope)**
- Scope is always resolved server-side from the authenticated principal (`ScopeService.resolve` → DB), never from client input; Super Admin → global, everyone else → assigned set, empty set fails closed. `scope.service.ts`, `scope.helpers.ts`.
- **Scope key-collision bug class fully eradicated.** Every spread of `warehouseFilter` combines only with non-warehouse keys (`productId`, `status`, `id` of a different relation), and every place a client `warehouseId`/`id` could collide uses `AND: [warehouseFilter(...), {...}]`. Verified in inventory (`:211`), movements (`:68`), purchase-orders (`:163,532`), stock-counts (`:115,236`), ai (`:53,80,141,242,250`), reports (`:38,104,167`), dashboard (`:29,33,69`), warehouses (`:51,62`). No `{ ...warehouseFilter(...), warehouseId: x }` override pattern remains anywhere.
- Mutations assert the target warehouse in scope before writing (`assertWarehouseInScope`) and by-id reads load within scope (`loadInScope` / `findFirst` + `AND`) — confirmed in inventory, purchase-orders, stock-counts, transfers (the one exception, goods-receipt read, is L1 and leaks only a status code).
- Every controller is guarded; the only unguarded controller is `health` (intentional). `auth` public routes (`login`/`register`) are intentional; `refresh`/`logout`/`me` carry method-level guards.
- Activity log browse is `@Roles(SUPER_ADMIN)` only, read-only, paginated (max 100). `activity.controller.ts`.

**Mass assignment / validation**
- Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` — unknown fields are rejected. `app.setup.ts:23-29`.
- Role/scope/status are never accepted from a self-service client; the only DTOs exposing `role`/`status` (`CreateUserDto`, `UpdateUserDto`) are reachable only behind `@Roles(SUPER_ADMIN)`.
- Stock buckets (`available/reserved/damaged/inTransit`) are not directly settable via any DTO — they change only through `applyMovement`.

**Injection**
- No `$queryRaw`/`$executeRaw` / string-interpolated SQL anywhere — all data access is parameterized Prisma. CSV export is the only injection vector (M1).

**Secrets & config**
- Env validated at boot via Joi (`env.validation.ts`); required secrets fail startup if missing. No `process.env` reads outside `config/`. `.env` is gitignored (root + `apps/api`); only `.env.example` files are tracked. No secrets returned in any DTO.

**Error handling / info disclosure**
- Global `AllExceptionsFilter` maps any non-HTTP error to a generic 500 and logs the real cause server-side only — no stack traces or internals leak. HTTP exceptions keep their intended status/message. `all-exceptions.filter.ts`.
- `userSafeSelect` excludes `passwordHash` and `hashedRefreshToken` from every user response; no service returns those fields. `users.select.ts`.

**Append-only ledgers**
- No `stockMovement.update/delete` or `activityLog.update/delete` call exists anywhere. Both are insert-only. `StockMovement` is always written in the same `$transaction` as the `InventoryItem` change via `applyMovement`. `inventory.service.ts:91-202`.

**State machines**
- PO (`Draft→Sent→Approved→Partially Received→Completed`) and Stock Transfer (`Request→Approve→Receive`) enforce legal transitions via `assertStatus`-style guards with optimistic locking; approval/reconcile are manager/admin-gated; stock-count reconcile writes Adjustment movements in-transaction. (Note: PO "approval required by threshold/settings" is not yet implemented — a feature gap, not a security defect.)

**Money / quantity types**
- No `Float` on any money/quantity column; money is `Decimal(12,2)`, quantities are `Int`. `schema.prisma`.

**Transport**
- CORS restricted to a configured allow-list of origins (`CORS_ORIGIN`, default `:5000`/`:5001`), parsed and trimmed. `main.ts:12-21`, `app.setup.ts:30`.

**AI non-autonomy**
- `generatePo` creates **Draft** POs only (human reviews/sends); all AI endpoints are scope-filtered and the write-side ones (`summarize`, `generate-po`) are manager/admin-gated. `ai.controller.ts`, `ai.service.ts`.

---

## Recommended remediation order

1. **M2 + M3** — close the deactivation/role-change revocation gap (re-check `status`/role on refresh and/or per request); highest real-world impact.
2. **M1** — CSV formula-injection escaping (cheap, clearly exploitable against report consumers).
3. **M5** — constant-time login path (dummy bcrypt compare).
4. **M4 + L5** — add throttling + body-size limit before any non-local deployment.
5. **L1, L3** — align goods-receipt lookup and low-stock re-fetch with the standard scoped pattern (consistency + defense-in-depth).
6. **L2, L4** — scope the AI supplier lookup; decide the Staff-transfer-request role question.
