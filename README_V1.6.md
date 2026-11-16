# OYS E-Library v1.6 — Hardening & UI Quality Pass

**This is a repaired foundation, not a feature-complete or production-ready application.** The last complete baseline is v1.5; v1.6 adds a critical authorization fix, published-document integrity guards, honest UI data states, and a reproducible QA framework.

## Exact changes

1. Enabled `@EnableMethodSecurity` so `@PreAuthorize` actually runs. Added explicit `/api/v1/elibrary/admin/**` Super Admin request authorization, read-only student endpoints and a deny-by-default policy for unknown paths.
2. Student sector lists now require an authenticated JWT and verified `college_id`, with college-visible published material constraints. Selected root categories can list immediate-subcategory subjects.
3. Published catalogue rows require clean original and reader assets. Added `V4__published_content_integrity.sql` migration to freeze released versions/TOCs/pages; reject unreviewed TOC and improperly typed/unsafe cover, source or reader assets; archive published materials if a clean asset becomes unsafe.
4. Production Next.js routes will return `404` for all demo-fixture screens even if `OYS_PREVIEW_MODE=true` is mistakenly enabled. Preview requires **both** `NODE_ENV=development` and `OYS_PREVIEW_MODE=true`.
5. Arctic Blue Student UI now hides empty taxonomy navigation until a sector is chosen; sidebar sector links target the intended sector. The logo, navigation and artwork remain intentionally restrained.
6. Admin KPI values are computed from fixture records; unconnected engagement metrics show a real empty state rather than fabricated numbers. Removed the inactive date-range filter. Demo upload form requires a material file and identifies its effect as preview-only.
7. Added Next.js ESLint flat config, a recommended Node 26 LTS selector (`frontend/.nvmrc`), CSS/TSX parse tests, guardrail contract tests, and live-browser smoke-test source for later execution.

## Validation conducted in this environment

- `bash tests/run_offline_checks.sh`: **45/45** baseline source/design checks, **31/31** hardening/UI contracts, **15/15** fixture pagination tests, **14/14** TypeScript/TSX files parse without syntax errors.
- Static Student/Reader/Admin HTML snapshots regenerated from React markup.
- Stylesheet parsed with `tinycss2`; static SVG files checked by the prior validator.
- `node --check frontend/eslint.config.mjs` passed.

## Verification blocked here

- `npm run lint`, `npm run typecheck`, `npm run build`: npm registry resolution failed (`EAI_AGAIN`) and frontend dependencies were not installed; no reproducible `package-lock.json` exists yet.
- `mvn test` / Spring Boot boot: Maven and resolved Spring dependencies unavailable in the environment.
- Real PostgreSQL/Flyway V1–V4 migration tests: PostgreSQL server unavailable; **do not apply V4 to production until integration-tested on a restored database copy**.
- Chromium desktop/mobile screenshots and dynamic overflow checks: browser startup timed out without a navigable page.
- Full OYS authentication, college subscription, rate limiting, API Gateway, document worker, PDF.js viewer, reading progress, premium transactions and analytics are **not implemented**.

## Repeatable local checks

```bash
# prerequisites: Node 26 LTS, Java 21+, Maven, PostgreSQL 16+, Python 3
bash tests/run_offline_checks.sh

cd frontend
nvm use 26
npm install       # generate and review package-lock.json; commit it afterward
npm run lint
npm run typecheck
npm run build
OYS_PREVIEW_MODE=true npm run dev

# from project root, in another terminal:
python tests/browser_smoke.py --base-url http://127.0.0.1:3000

cd backend
mvn test
```

Run Flyway migrations in a disposable Postgres container with real schema and fixture data before updating any persistent environment. Configure JWT environment only from the existing OYS identity provider; never use fake production credentials.

## Design acceptance policy

See `frontend/UI_STANDARDS.md`. No GIF/animated material thumbnails, no decorative AI-style background marks, no looped animations. Only navigation SVG strokes may animate subtly on hover/focus. Placeholder fixtures must never masquerade as live metrics. Every new production screen needs loading/empty/error/permission states and keyboard/mobile regression checks.
