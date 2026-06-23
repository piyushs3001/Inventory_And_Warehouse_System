---
paths:
  - "apps/api/**/*.controller.ts"
  - "apps/api/**/*.dto.ts"
  - "apps/api/openapi.json"
  - "apps/web/src/lib/api/**"
  - "apps/web/orval.config.ts"
---

# API Contract & Orval Client

The web app and the API are kept in lockstep by a generated contract. Never bypass it.

## The pipeline (Swagger → Orval)

1. NestJS `@nestjs/swagger` (CLI plugin) describes endpoints — see the **nestjs-api-conventions** rule for the required annotations.
2. `npm run api:openapi` builds the API and writes committed `apps/api/openapi.json`.
3. `npm run web:client` runs Orval (`apps/web/orval.config.ts`) → committed React-Query hooks + model types in `apps/web/src/lib/api/generated/`.
4. `npm run api:gen` does steps 2–3 together.

## Hard rules

- **After any endpoint or DTO change, run `npm run api:gen` and commit `openapi.json` + `generated/` in the same change.** A stale client means the types lie.
- **Never hand-edit `apps/web/src/lib/api/generated/`** — it is `clean: true` and regenerated wholesale; edits are lost and mask drift.
- **The web app calls the API only through the generated client** (the React-Query hooks). No hand-written `axios`/`fetch` to the API in app code.
- **Only `apps/web/src/lib/api/axios.ts`** (the `customInstance` mutator) may import `axios` directly. It owns `baseURL`/auth; `customInstance` MUST accept `(config, options)` or generated code won't compile.
- Don't double-prefix paths: OpenAPI paths are prefix-free (`/auth/login`); `/api/v1` lives in the mutator `baseURL` (`NEXT_PUBLIC_API_URL`).

## Gotchas

- The OpenAPI generator runs against **built** output (`nest build && node dist/openapi/generate-openapi.js`) so plugin metadata is present; it does not need a DB.
- Response shapes need explicit `@ApiOkResponse({ type: Dto })` — only request bodies auto-infer.
- Swagger UI: `http://localhost:5001/api/v1/docs`.

## Checklist before claiming an API/contract task done

- [ ] Endpoint annotated (tags, bearer auth, response DTO) per the **nestjs-api-conventions** rule.
- [ ] `npm run api:gen` run; `openapi.json` + `generated/` regenerated and committed together.
- [ ] No file under `generated/` was hand-edited.
- [ ] Web consumes the endpoint via the generated React-Query hook — no raw `axios`/`fetch`.
- [ ] Only `axios.ts` imports `axios`; no path double-prefixing.
