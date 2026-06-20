# QA — Barcode / QR Generation (Phase 2 · Slice 5a)

**Date:** 2026-06-20 · **Flow:** Catalog → Barcode/QR generation
**Spec:** `docs/superpowers/specs/2026-06-20-phase-2-slice-5-barcodes-design.md`
**Surfaces:** Admin Portal `/products` (product + variant barcode, download), Staff App `/catalog` (read-only variant barcode)
**Method:** Playwright MCP, live servers (API :5002, admin :5001, staff :5000), seeded Super Admin + a created Warehouse Manager; a product (`HOODIE-BASE`) + variant (`HOODIE-BLU-L`, no barcode value).

## Summary

**9/9 scenarios passed. No open bugs.** Both code-review cleanups were applied before QA (extracted a shared `BarcodeControls` into `@iws/ui`; single-sourced the symbology union in the API). Automated coverage: api unit **125** (incl. barcode service + product/variant `barcode()` specs), e2e **138** (incl. 9 `barcodes` e2e), admin **56**, staff **50** — full `npm run qa:gate` green. Invariant review clean; code review clean.

## Scenarios

| # | Scenario | Surface | Type | Result |
|---|---|---|---|---|
| 1 | Product edit → **Show** product barcode → renders PNG (`data:image/png;base64,…`), alt "Barcode for HOODIE-BASE" | Admin | Positive | **Passed** |
| 2 | Symbology toggle has `aria-pressed`; Code128 selected by default | Admin | Positive (a11y) | **Passed** |
| 3 | **Download PNG** link present, `download="HOODIE-BASE-code128.png"`, `href` = data URI | Admin | Positive | **Passed** |
| 4 | Switch to **QR** → image regenerates, `aria-pressed` flips, download name → `HOODIE-BASE-qr.png` | Admin | Positive | **Passed** |
| 5 | Variant row **Barcode** toggle → renders variant barcode; value falls back to SKU (`HOODIE-BLU-L`, no barcode value) | Admin | Positive (fallback) | **Passed** |
| 6 | Staff catalog: expand product → **Show barcode** on variant → renders PNG, alt "Barcode for HOODIE-BLU-L" | Staff | Positive | **Passed** |
| 7 | Staff barcode view is **read-only** — Code128/QR toggle present, **no Download link** | Staff | Negative (read-only) | **Passed** |
| 8 | Create dialog shows **no** barcode section (needs a saved product) | Admin | Boundary | **Passed** |
| 9 | API sanity: `GET /products/:id/barcode` returns `{value, symbology, png}` with a real PNG data URI | API | Positive | **Passed** |

### Evidence (screenshots)
- `screenshots/qa-barcodes-01-admin-product-code128.png` — product barcode (Code128) + toggle + download.
- `screenshots/qa-barcodes-02-admin-variant-barcode.png` — product + variant barcodes in the edit dialog.
- `screenshots/qa-barcodes-03-staff-variant-barcode.png` — staff read-only variant barcode (no download).

## Covered by automated tests (not re-driven in the browser)

- **Invalid `symbology=bogus` → 400** — `barcodes.e2e-spec.ts`.
- **Unknown product → 404**; **variant under the wrong product → 404** (ownership) — e2e + unit.
- **Unauthenticated → 401** — e2e.
- **Staff (STAFF role) GET barcode → 200** (reads open to any authed user) — e2e.
- **Variant barcode prefers its `barcode` value over SKU when set** — e2e + unit.
- **code128 vs qr produce different output** — barcode.service spec.

## Bugs found & fixed

- **(during build) bwip-js rejected `height: undefined` for QR** — `height`/`includetext` only apply to 1D code128; passing `undefined` threw `invalidOptionType`. **Fixed** — build per-symbology option objects (QR omits those keys). Caught by the barcode.service unit spec before QA.

## Not covered / deferred

- **5b — product/variant image upload (MinIO)** — **DEFERRED, infra-blocked.** MinIO is not provisioned (no binary, no Docker per CLAUDE.md, no S3 creds); `S3_*` env are placeholders. Ready to build once MinIO is running. This is the only remaining piece of Phase 2.
- Bulk/sheet label printing, custom label dimensions/templates — out of scope (YAGNI).
- Throttling specific to barcode generation — relies on the app-level global throttler; revisit only if these endpoints become hot (noted by invariant review).
