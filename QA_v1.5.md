# OYS E-Library v1.5 — Update, Debug and Security Validation Report

**Audit date:** 16 November 2026  
**Compared with:** v1.4 extracted starter  
**Scope:** category/subcategory navigation, paging, sorting and filters, corresponding PostgreSQL migration, taxonomy/catalogue APIs, preview safety, source tests.

## Implemented in the project source

1. **V3 migration:** `categories` with sector ownership, optional root parent, unique sibling/root slug, one subcategory maximum, activity guards, same-sector category FK on subjects, backfill to per-sector General, and trigram search indexes. Existing subject/material/page/progress/credit identifiers are unchanged.
2. **Authenticated Spring Boot reads:** list categories and subjects; published material search with bounded (max 48) server-side pages, 4 sort modes and a consistent count+result transaction. The queries exclude inactive categories/subjects, unpublished materials and college-restricted items not visible to the JWT's `college_id`. Students lacking that claim are denied. Category/subject listings are also scoped to visible published materials.
3. **Super Admin APIs:** create/update categories, create subjects, change subject category. Class-level Super Admin authorization plus database FK/trigger constraints. These are not yet called from the public demo Admin UI.
4. **Student demo UI:** sector first, then category/subcategory/subject; local search, access/discovery filters, title/recent sorts and page-size options 12/24/48 with reset on filter changes. Current data is explicitly fixture-only.
5. **Admin demo UI:** category/subcategory overview, dependent material upload selectors and sample pagination. No pretending that the preview creates actual categories or uploads files.
6. **Static artwork:** 14 local SVG topic-specific covers, validated XML; 0 GIFs. Only sidebar icons animate on hover/focus, with reduced-motion CSS.
7. **Preview safety:** all Next.js fixture routes (including Admin) are gated behind **server-side** `OYS_PREVIEW_MODE=true` check, default disabled. This prevents accidental production deployment of unprotected demo dashboards.
8. **Regression tooling:** replaced v1.4 `validate_design.py` which referenced removed `LibraryExplorer.tsx`; created independent filtering/pagination test suite.

## Tests executed — observed results

| Test | Actual result | Interpretation |
|---|---|---|
| Python architecture/static design validation | **45/45 PASS** | Source, migrations and authorization constructs are present; **not** SQL execution |
| Node catalogue filter & page test suite | **15/15 PASS** | Filter, sort, saved/trending, paging boundaries, no duplicates |
| Independent TypeScript compilation of pure catalogue utilities and fixtures | **PASS** | Utilities compile with global `tsc`; **not** full Next.js typecheck |
| Static TSX initial-state HTML renderer | **PASS** | Student, Reader and Admin snapshots regenerated; not React/browser integration |
| CSS syntax parsing (`tinycss2`) | **299 top-level rules, 0 parsing errors** | Syntax sanity only, not layout correctness |
| HTML snapshot check | **No duplicated IDs; main landmark on all three pages** | Basic markup sanity, not full accessibility |
| Static SVG XML check | **14 valid, 0 GIF files** | Technical topic illustrations are static |
| Chromium headless screenshot | **TIMEOUT** | Browser did not produce a screenshot; layout gap tests **NOT verified** |
| Next.js production build/typecheck | **NOT RUN** | npm node_modules unavailable; Next/React dependencies not installed |
| Maven Spring Boot compile/test | **NOT RUN** | Maven executable unavailable; Java tests added but not executed |
| Flyway migration against PostgreSQL | **NOT RUN** | PostgreSQL service/CLI unavailable; verify V3 transactionally on a fresh and an existing DB |
| Live API JWT/college integration tests | **NOT RUN** | Existing OYS identity contracts and issuing server unavailable |
| Dynamic penetration/security assessment | **NOT RUN** | Requires running deployed services and real credentials/contracts |

Test stdout: `QA/offline_test_results.txt` within the archive. CSS/HTML results: `QA/ui_static_report.txt`.

## Debug fixes made

- Fixed stale design validator references and outdated CSS breakpoint assumptions.
- Implemented page-index clamping when the result set shrinks; reset page on search/filter/size changes.
- Constrained page size and page index; no untrusted ORDER BY expressions or raw SQL search strings.
- Escape wildcard characters during `ILIKE` search (`!`, `%`, `_`) to preserve literal user search semantics.
- Require a validated OYS Student college claim; added college visibility to taxonomy endpoints, not just material list.
- Prevent selecting subjects in cross-sector categories via composite foreign key; prevent multi-level recursion and accidental deactivation of populated categories.
- Added focus trapping and return focus behaviour for the mobile navigation menu; dynamic keyboard QA remains pending.
- Disabled unprotected demonstration Next.js routes by default.
- Expanded static subject-specific thumbnails instead of using Java artwork for all unrelated topics.

## Open defects / security risks (release blockers)

**P0 — No real end-to-end E-Library:** Frontend demo lists are not API-connected. Material upload/scanning, PDF.js streaming, TOC processing, 8-second server verified Mark as Read, cross-device progress, bookmarks, and premium credit transactions are **not implemented**. Do not describe these as working features.

**P0 — OYS identity & subscription contracts absent:** JWT issuer/audience/JWKS, role claims, college membership freshness, subscription expiry and refresh/revocation integration require real OYS integration. A trusted JWT `college_id` is a necessary gate but not proof that college enrollment is currently active.

**P0 — Secure Admin production UI absent:** The shipped Admin UI is a sample preview, intentionally inaccessible without explicit preview mode. Replace it with authenticated BFF/session/CSRF and backend object-level authorization before production.

**P0 — Unverified runtime migrations / builds:** PostgreSQL and Maven execution is mandatory before shipping. V3 uses `pg_trgm` extension; grant migration role appropriate extension privileges. Confirm migration works with legacy sectors/subjects/materials and in parallel reads.

**P1 — Pagination scale:** Offset pagination is constrained to page index <= 10,000 and size <= 48. At much larger content volumes, use cursor/keyset pagination for deep result traversal. Counts and list queries use a repeatable-read transaction, but execution plans/index usage must be verified on seeded PostgreSQL data.

**P1 — Browser/accessibility QA pending:** Chromium was not usable here. Inspect actual Chrome/Firefox/Edge layouts at 320, 375, 768, 1024 and 1440 pixels; verify no horizontal overflow, TOC usability, keyboard focus, 200% zoom, contrast and screen-reader navigation.

**P1 — Remaining backend security:** Redis rate limiting, API gateway, S3 object authorization, content scan and conversion isolation, worker permissions, secrets management, HTTP CSP/CSRF, role integration, transactional wallet tests and threat-model-driven security scans are unfinished.

## Required acceptance gate for this increment

In an integration environment: `mvn test` and `mvn spring-boot:run` (real OYS test JWT); apply Flyway V1/V2/V3 against PostgreSQL 16+; seed categories/subjects/materials and test college allowlists, 403/404 isolation, empty result, search literals, sort allowlist, bounds, DB uniqueness/depth; `npm ci && npm run typecheck && npm run build`; run Playwright UI tests over Student/Admin at the above viewport widths. Only after those pass should this increment be considered runtime-validated.

**Verdict:** v1.5 taxonomy/pagination is **implemented in source and offline-tested**, but **runtime verification remains pending** and the overall application is still not feature-complete. No production readiness claim is made.
