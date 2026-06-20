# QA Report — Phase 7: AI Features

- **Flow/task:** Phase 7 — AI Features (Reorder, Forecast, Chat, PO Generator, Report Summarize) across Admin Portal (`/ai`, `/reports`) and Staff App (`/ai`).
- **Date:** 2026-06-19
- **Tested by:** QA (Playwright MCP, real browser flows + API/DB verification)
- **Environment:** Admin `http://localhost:5001` · Staff `http://localhost:5000` · API `http://localhost:5002/api/v1`
- **Users:** Super Admin `admin@iws.local` (global) · Staff `staff@iws.local` (scoped to Central Warehouse)

## Framing / deferrals (by design — not defects)

- **No LLM key configured.** Verified `configured:false` (Chat) and `llmEnhanced:false` (Summarize) from the service logic (`AiService.llmConfigured()` reads `OPENAI_API_KEY`/`GEMINI_API_KEY`, both unset).
- **Chat = transparent keyword lookup**, clearly labeled "Basic keyword lookup — an LLM provider is not configured". It answers simple "how much <product>" from real scoped stock and does **not** fabricate a conversational answer. PASS.
- **Summarize = figure-based/templated**, labeled "AI summary (figure-based, no LLM configured)". Figures are read straight from the report. PASS.
- **pgvector RAG retrieval is deferred** (requires an LLM provider); the keyword fallback is the documented stand-in.
- **Reorder / Forecast / PO Generator are fully real** (statistical, reproducible, no LLM) and were verified end-to-end including the math.

## Actual seed vs brief (important discrepancy — see Note 1)

The DB at test time (Central Warehouse) was:

| Product | SKU | Available | Reorder level | Status |
|---|---|---|---|---|
| Cola 330ml Can | COLA-330 | 40 (→35 after QA adjustment) | 50 | LOW |
| Stapler Heavy Duty | STAP-HD | 5 | 10 | LOW |
| Spring Water 1L | WATER-1L | 100 | **100** | at reorder level |

The QA brief described Water as "reorder 50 → healthy / NOT listed", but the seeded reorder level is **100**, not 50. With the rule `available <= reorderLevel` (100 ≤ 100), Water legitimately qualifies as at-reorder and **is** listed. This is a **seed/brief mismatch, not a product defect** — the boundary-inclusive rule is correct behavior. See Note 1.

## Scenarios

### Admin Portal

| # | Scenario | Result | Evidence |
|---|---|---|---|
| 1 | **Reorder suggestions** list low-stock items with suggested qty + rationale | **Passed (with Note 1)** | Table shows Stapler (5/10→15), Cola (40/50→60), Water (100/100→100). Cola & Stapler correct per brief. Water appears because seeded reorder=100 (boundary), not the brief's 50 — correct rule behavior, not a bug. `qa-ai-reorder.png` |
| 2a | **Forecast** (horizon 7, no consumption) renders avg/day + projected demand | **Passed** | Cola/Stapler/Water all avg=0, demand=0, stock-out "—". Header "Moving average over the last 30 days · horizon 7 day(s). Advisory baseline." `qa-ai-forecast.png` |
| 2b | **Forecast after creating consumption** (Inventory: Cola Available −5 → 35) shows non-zero avg + projected stock-out date | **Passed** | Cola: avg/day **0.17** (5/30), projected demand **2** (ceil 0.17×7), projected stock-out **11/01/2027** (≈35/0.1667 days out). Math verified correct. `qa-ai-forecast-nonzero.png` |
| 3 | **Chat** "How much cola do we have?" reports real available via keyword lookup, labeled basic/no-LLM, no fabrication | **Passed** | Answer: "Cola 330ml Can (COLA-330): 40 available across your warehouses. (Basic keyword lookup — set OPENAI_API_KEY or GEMINI_API_KEY...)" · Sources: COLA-330 · explicit not-configured notice. `qa-ai-chat.png` |
| 4 | **PO Generator** creates Draft POs grouped by supplier (Acme: Cola+Stapler), skips Water; nothing auto-sent | **Passed** | UI: "1 draft PO created — PO-00175 · Acme Supplies → Central Warehouse · 2 line(s) · 96.75" + "Skipped (1) Spring Water 1L: No prior supplier on record". DB confirms PO-00175 status **DRAFT**, lines COLA-330 ×65 @0.45 + STAP-HD ×15 @4.50 = 96.75. Purchase Orders list shows it as **DRAFT** (not Sent/Approved). `qa-ai-generate-po.png` |
| 5 | **Reports → Summarize** produces figure-accurate plain-language summary, labeled figure-based/no-LLM | **Passed** | "AI summary (figure-based, no LLM configured) — Inventory report — Items: 3; Total units: 140; Low-stock items: 3; Total stock value: 68.25." Matches report cards exactly. `qa-ai-report-summary.png` |

### Staff App

| # | Scenario | Result | Evidence |
|---|---|---|---|
| 6 | Staff assistant shows **Chat + Reorder** only (scoped to Central), no Forecast / PO Generator / Summarize | **Passed** | DOM probe: `hasForecast:false, hasPoGen:false, hasSummarize:false, hasChat:true, hasReorder:true`. Reorder scoped to Central (Cola 35, Stapler 5, Water 100). Staff chat returns "Cola 330ml Can (COLA-330): 35 available..." correctly scoped. `qa-ai-staff-assistant.png` |

### Authorization (server-side — covered by e2e + spot-checked live)

| # | Scenario | Result | Evidence |
|---|---|---|---|
| 7 | `summarize-report` + `generate-po` are manager/admin only → **staff 403** | **Passed** | Live API with staff token: summarize-report → **403**, generate-po → **403**, reorder → **200**. |
| 8 | AI reads are warehouse-scoped; a scoped user cannot pull another warehouse's data via `warehouseId` filter (scope-bypass fix) | **Passed** | Staff `GET /ai/reorder-suggestions?warehouseId=<North Depot>` (out of scope) → `[]` (filter ANDed with scope, no leak). Covered by `apps/api/test/ai.e2e-spec.ts` "AI output is scope-limited and out-of-scope POs are rejected" (manager scoped to empty W2, generate-po targeting out-of-scope W1 creates nothing). |
| 9 | `ai.e2e-spec.ts` regression suite | **Passed** | `9 passed, 9 total` (reorder, forecast, chat keyword fallback, figure summary, draft PO + skip, staff 403, scoped staff read, 401 unauth, scope-limit/out-of-scope PO rejection). |

## Bugs found

**None.** No scenario fabricated AI output, auto-sent a PO, or showed wrong figures. All advisory/draft framing is explicit in the UI:
- AI Assistant page header: "Advisory only — every output is a suggestion or draft a human reviews. Nothing is applied or sent automatically."
- Reorder & PO Generator carry a "Suggestion — review before acting" badge.
- PO Generator: "Nothing is sent — review and send them from Purchase Orders." Confirmed the generated PO persists as **DRAFT**.

## Notes

1. **Water listed in reorder/forecast (seed/brief mismatch, not a defect).** The brief expected Water "healthy, reorder 50, not listed". The seeded reorder level for WATER-1L is **100** with available **100**, so the boundary-inclusive rule `available <= reorderLevel` correctly flags it as at-reorder. The product logic is sound (an item exactly at its reorder point should be surfaced). If the intended demo state is "Water healthy/not listed", lower its available below 100 **or** raise reorder below 100 in the seed — this is a data/seed change, not a code fix. Cola and Stapler behaved exactly as specified.

2. **Forecast/reorder figures shifted after the QA consumption adjustment** (Cola Available 40→35). This is expected and correct: after −5, Cola's reorder suggested qty became 65 (`2×reorderLevel − available = 100 − 35`) and the draft PO line reflects 65. All downstream figures stayed internally consistent.

## Test data side effects (left in dev DB)

- One `ADJUSTMENT` StockMovement on Cola (availableDelta −5, reason "QA: simulate consumption for forecast test"); Cola Available is now **35** (was 40). Audit trail intact (one movement per quantity change).
- One generated **Draft** PO (PO-00175, Acme, Central, Cola ×65 + Stapler ×15). Not sent/approved.
- e2e run truncated the `users` table; **re-seeded** afterward (`db:seed` + `seed-staff.ts`) and re-verified admin/staff logins return 200.

## Coverage / deferred

- Covered: all 6 functional scenarios (positive) + authz negatives (staff 403, out-of-scope filter) live and via e2e.
- Deferred (by design, no LLM key): full conversational Chat (RAG over pgvector) and LLM-enhanced summaries — both fall back to transparent, labeled non-LLM paths.
- Not exercised in-browser: forecast/reorder for the Supplier role (no Supplier test user provided; Supplier has no warehouse scope and these endpoints are scope/role-gated server-side).
