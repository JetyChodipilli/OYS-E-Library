# OYS E-Library v1.6 — Debug Audit and Risk Register

**Audit date:** 2026-11-16  
**Source:** unpacked OYS_E_Library_v1.5_Updated_Project.zip (prior conversation attachment).  
**Scope:** backend Java, Flyway migrations, frontend Next.js/React, offline validation and deployment scaffolding.  
**Caution:** This is a source-verified hardening pass, not a penetration test or production acceptance.

## Verified issues corrected in source

| Severity | Finding | Evidence in v1.5 | Change in v1.6 | Validation |
|---|---|---|---|---|
| Critical | Controller `@PreAuthorize` not activated | `SecurityConfiguration` lacked `@EnableMethodSecurity` | Enabled method security; explicit HTTP admin role gate and deny-all fallback | Static guardrail 31/31; runtime authorization still untested |
| High | Demo/Admin could be deployed if preview flag accidentally set | Preview guard only tested `OYS_PREVIEW_MODE` | Preview requires `NODE_ENV=development` too | Static |
| High | Sectors were returned without college visibility | Old `CatalogueController.sectors()` listed all active sectors | College-scoped published catalogue join and reject missing college claim | Static |
| High | Existing published page/TOC/asset metadata could be changed after publish | V2 only checked readiness at publication time | Additive V4 migration freezes published versions, pages, TOC, clean assets; handles quarantine | **Migration execution not tested** |
| High | File scan no longer clean, while catalogue status could remain published | Published-material query didn't verify asset scan | Query now joins clean source/reader assets and V4 archives unsafe references | Static |
| Medium | Admin KPIs used fabricated activity values and inactive range control | Hard-coded reader metrics and chart | Fixture-derived material KPIs, real analytics empty state, remove dead control | React-markup snapshot |
| Medium | Sidebar sector controls were noninteractive text | Sidebar rendered `<span>` | Sector links include selected sector in query | Source and static parsing |
| Medium | Category area showed an empty section by default | Rendered panel even when no sector selected | Panel appears after sector selection | Source and static parsing |
| Medium | Frontend lint script lacked ESLint configuration | `npm run lint` defined but no config | Next 16 ESLint flat configuration added | Syntax checked; lint execution blocked |
| Low | Preview upload form implied validated upload without file | File input optional and status called validation | File input required, preview status explicitly does not upload | Source |

## Implementation coverage (do not confuse UI with working service)

| Feature | Current state | Main blocker |
|---|---|---|
| OYS identity integration | JWT resource server configured; role/college contract unverified | Real issuer/JWKS, claim schema and BFF |
| Super Admin sector/category/subject APIs | Controller and SQL exist; static checks pass | Maven + live PostgreSQL + request authorization tests |
| College-scoped catalogue API | Implemented in source; no authenticated request test | JWT integration and database |
| Student sector/category navigation + pagination | Functional on local fixtures | Bind APIs, backend errors, caching |
| Student saved materials | React memory only | Persistence endpoints + authorization |
| PDF Reader | UI mock; no actual PDF.js | Storage, signed/authorized streaming, DOCX processing |
| Eight-second progress / bookmarks / resume | Client demo only | Server timing, concurrency, version-aware persistence |
| 3 Free completions → 1 Premium credit | Database structures only | Atomic transactions, idempotency and subscription checks |
| Super Admin upload/TOC/publish | Form preview only | Processing queue, antivirus, private object storage, approval API |
| Trending & analytics | Not connected; marked unavailable | Event pipeline and aggregation |
| Redis rate limiting / API gateway | Not implemented | Gateway deployment, per-route limits, Redis coordination |
| Full browser and mobile quality | CSS/source static only | Live responsive/keyboard/contrast tests |

## Open security risks / release blockers

1. **Critical:** There is no end-to-end identity, JWT role, subscription and college-access authorization verification. Test student-to-admin and cross-college requests through the actual proxy chain.
2. **Critical:** No secure file-upload service or document-processing worker exists. Before enabling uploads, add content-type sniffing, extension checks, byte limits, malware scanning, isolated DOCX conversion, private storage and quotas.
3. **Critical:** No server-side reading-timer, duplicate-completion, premium-credit ledger transaction or redemption endpoint exists. Frontend mock state is not a security boundary.
4. **High:** Flyway V4 must pass PostgreSQL migration, upgrade-from-v1.5 and immutability/quarantine tests before release.
5. **High:** No gateway/Redis rate limiting, request budgets, abusive-file controls or audit alerting.
6. **High:** `npm audit`, transitive dependency lockfile, Next build/lint, Maven tests and DAST could not run in this container; no claim of zero vulnerabilities is possible.
7. **High:** Browser screenshot/overflow and accessibility tests remain unverified. The newly provided `tests/browser_smoke.py` should be run on a real dev server and its failures fixed before UI approval.
8. **Medium:** There is no content rights/licensing workflow and no verified subscription expiry history rules in backend code.

## UI quality review

Arctic Blue is retained. Materials use static topic illustrations. No GIF assets or continuous animation loops were found. Only sidebar navigation SVG transforms animate on hover/focus; a reduced-motion media rule exists. Admin fake traffic figures were removed to prevent a superficial dashboard. Missing from a finished product: consistent loading/error states, actual PDF reading, useful real material search and responsive screenshots across browsers. UI is still a **design preview**, not ready for real students.

## Required production gates

- Restore production-like PostgreSQL to a disposable database; run Flyway V1–V4 and all integrity, rollback/backup and concurrency scenarios.
- Install dependencies with lockfile; pass ESLint, TypeScript, Next production build and dependency vulnerability scan.
- Pass Spring Boot/Maven tests, integration tests with test JWT issuers, unauthorized role checks and signed-file access tests.
- Run live-browser smoke at 360/390/768/1280/1440, 200% text zoom, reduced motion, keyboard-only and screen reader checks.
- Build all unfinished E-Library modules; pass upload→publish→read→mark→complete→credit→redeem→resume end-to-end flow.

**Disposition:** v1.6 is a **safer and more honest project foundation**, not a completed debug of all runtime behavior. Do not deploy as a student-accessible production service.
