# v1.5 Addendum — Security Review: Category Navigation and Pagination

**Current project addendum:** [06_CATEGORY_HIERARCHY_AND_PAGINATION.md](06_CATEGORY_HIERARCHY_AND_PAGINATION.md). Adopt **Sector → Category → optional Subcategory → Subject → Material** with V3 migration and safe bounded published-material paging; this supersedes the earlier direct `sectors → subjects` layout. Migration retains legacy subjects under a per-sector General category. The new catalogue API enforces active hierarchy and verified OYS `college_id` claim. Frontend screens remain sample-only until OYS login, college membership, and document integrations are available. The migration, Maven build and browser QA have **not** been verified at runtime here.

---

# OYS E-Library — Design, Schema and Starter Security Review

**Review date:** 2026-11-16 | **Scope:** V1 PostgreSQL migration, HLD, PRD, API contract and starter source | **Verdict:** Security-oriented design baseline created. **NOT production secure / NOT penetration-tested.**

## Review method
- Manual STRIDE threat modeling of user, gateway, identity, worker, storage and DB trust boundaries.
- Static review for schema keys, foreign keys, CHECK clauses, indexes, wallet invariants, data validation and leak-prone configurations.
- Review against OWASP authorization, IDOR and File Upload cheat sheets; Spring Security JWT reference; Next.js security guidance.
- Automated offline checks in `tests/validate_design.py` for present artefacts and required invariants.
- Unavailable in this environment: real PostgreSQL migration execution, Java Maven test compile, npm installation/build, OYS identity integration tests, dynamic penetration test and cross-browser screenshots.

## Findings and mitigation plan

| ID | Severity | Finding / exposure | Design mitigation | Current state |
|---|---|---|---|---|
| SEC-01 | **BLOCKER** | OYS JWT issuer, audience, JWKS and canonical roles are unspecified | Fail closed; require exact OYS JWT contract; verify in gateway **and** service | NOT INTEGRATED |
| SEC-02 | **BLOCKER** | Subscription-expiry existing-access definition ambiguous | Explicit `student_material_access` grant, preserve entitlement, deny new redeem when expired | POLICY OPEN |
| SEC-03 | **HIGH** | College-level IDOR/BOLA on material, page, bookmark, progress, streams | Derive student+college from validated OYS context; re-check visibility on every API and PDF range | DESIGNED / NOT IMPLEMENTED |
| SEC-04 | **HIGH** | Duplicate unlock or wallet double spend under races | Row lock reward account; transaction; ledger event_key uniqueness; idempotency table and unique entitlement | SCHEMA PREPARED / SERVICE PENDING |
| SEC-05 | **HIGH** | Forged time-on-page/read receipts | Backend page sessions, bounded server heartbeats, one active session, explicit mark; timers cannot prove reading | SCHEMA PREPARED / SERVICE PENDING |
| SEC-06 | **HIGH** | Malicious PDF/DOCX parser input, zip bombs, macro/data exfil | Extension+MIME+magic, archive/decompression limits, malware scan, isolated offline conversion, admin approve | DESIGNED / WORKER PENDING |
| SEC-07 | **HIGH** | PDF publicly shared or guessed object keys | Private object store, authorized reader streaming or short-lived signed URLs, request-scoped access, no open bucket | DESIGNED / STORAGE PENDING |
| SEC-08 | **HIGH** | Cross-version progress fraud by mapping wrong pages | Match same material + distinct versions + eligible content fingerprints, admin-approved mappings, audit migrations | V2 DB trigger verifies same material/distinct version/eligibility; **migration approval policy remains in service** |
| SEC-09 | **MEDIUM** | Dynamic unsafe script / descriptions leading to XSS | React auto-escape, no dangerouslySetInnerHTML; sanitize rich text if introduced; nonce CSP at OYS BFF integration | Basic safe TSX, CSP NOT YET CONFIGURED |
| SEC-10 | **MEDIUM** | JWT in browser localStorage / CSRF on cookie BFF | Keep short-lived access token server-side; HttpOnly/Secure/SameSite cookie, csrf token/Origin check for mutations | BFF NOT IMPLEMENTED |
| SEC-11 | **MEDIUM** | Leaked logs, student data, document titles | Structured logs with request correlation; no bearer, cookies or DOCX content; minimize student PII | GUIDELINE ONLY |
| SEC-12 | **MEDIUM** | Stale Redis college visibility/session state | Invalidate scoped cache on restriction change; bounded TTL and revocation strategy | DESIGN ONLY |
| SEC-13 | **MEDIUM** | TOC recursive parent cycles and invalid revision mapping | Application recursive validation or DB trigger before publish, enforce same material for page mapping | V2 TRIGGER ADDED / TEST PENDING |
| SEC-14 | **MEDIUM** | SQL role can update wallet fields outside audited transactions | Separate DB role privileges; only service writes; trigger or stored function ledger-to-wallet reconciliation | POLICY / PRIVILEGE WORK PENDING |
| SEC-15 | **MEDIUM** | Unbounded request size, enumeration and rate abuses | Gateway per-route Redis limits, size limits and count quotas; 404 for unauthorized material IDs | GATEWAY PENDING |
| SEC-16 | **MEDIUM** | Missing current browser layout test | Responsive CSS, min-width:0, no external artwork, automated Playwright Chromium/Firefox/WebKit QA in CI | CSS WRITTEN / BROWSER QA PENDING |
| SEC-17 | **LOW** | S3 and PostgreSQL retention/access revocation unspecified | Encrypt at rest, private IAM, backup drills, retention and deletion | OPEN INFRA DECISION |
| SEC-18 | **HIGH if LLM added** | Uploaded document prompt injection contaminates admin actions | Do not call LLM or execute document instructions; deterministic TOC extraction in v1; future AI needs data/tool isolation | **NO AI IN STARTER** |
| SEC-19 | **MEDIUM** | User-supplied `roles` claim mapped without authoritative OYS exact format | Strict authority allowlist only AFTER signature validation; align with approved OYS issuer claim semantics | MAPPING PROVISIONAL |
| SEC-20 | **MEDIUM** | Versioned PDF contains scripts or malicious links rendered in browser | PDF.js hardened reader; disable external link auto-open, sandbox browsing, PDF server conversion/validation | READER NOT IMPLEMENTED |

## Database schema validation

**Strengths present in migration:**
- Foreign keys across sector/subject/material/version/pages/TOC and ledger references.
- Composite FKs disallow TOC destinations or completion pages from another version.
- Unique completion by `(student_id,page_id)` and qualifying Free completion by `(student_id,material_id)`.
- Wallet generated available balance, invariant `earned_credits = qualifying_count / 3`, and nonnegative redeemed balance.
- Unique Premium entitlement per student/material and request idempotency key per student.
- Archived materials and version files restricted from cascading deletes to prevent silent loss of progress/rewards.
- Basic text, slug, SHA-256 and file-size checks.

**SQL/database-specific gaps to close before production:**
1. `material_page_mappings` now has a V2 trigger asserting same material, distinct versions, eligible pages and verified exact hashes; service still must check approved migration topology and version ordering.
2. V2 detects recursive TOC cycles on row updates. Concurrent hierarchy edits still require transactional review tests.
3. `material_versions.total_page_count` and `eligible_page_count` are denormalized worker totals. Reconcile transactionally against `material_pages` before publish; admin cannot edit counts directly.
4. `student_material_progress.completed_page_count` denormalized: update in same transaction as page completion or derive on query.
5. `student_reward_accounts` invariants only protect aggregate arithmetic; direct ledger/balance tampering is not prevented by checks. Restrict privileges and require audited service path.
6. One active reading session partial unique index requires actively closing/expiring prior ACTIVE row inside transaction, not just relying on TTL.
7. Same college student may have moved colleges: define which OYS college ID authorizes prior access grants, reconciling revocation policy.
8. Migration must run under an elevated Flyway DB role, while app runtime uses least-privilege role; avoid CREATE EXTENSION in app migrations if cloud DB forbids it.

## Adversarial test matrix (required for CI / release)
| Test | Expected |
|---|---|
| Expired/invalid audience JWT calls `/api/v1/elibrary/sectors` | 401 |
| Student JWT POSTs `/admin/sectors` | 403 |
| Signed JWT with forged `college_id` body field | Ignored; derived OYS college |
| Student requests unauthorized PDF HTTP Range | 404/403 without leaking PDF bytes |
| Rapid heartbeats or tab-hidden event | Cannot earn eight seconds early |
| Two mark requests on same page concurrently | One completion record |
| Reread completed Free material or revised copy | No new credit contribution |
| Two Premium unlock requests concurrently with one credit | Exactly one debit/entitlement |
| Same idempotency key reused for different material | 409 |
| Free material switched to Premium/archive | Earned ledger never invalidated |
| TOC XML including script tags and external URLs | Rendered inert; no script/remote fetch |
| DOCX with ZIP bomb/macro/remote template references | Quarantined/rejected, worker network disabled |
| PDF huge page count / malformed xref | Graceful processing failure and alert |
| New version matched to wrong material page | Migration rejected |
| Super Admin restricts material to other college | Student blocked on next authorized file request |
| UI across 360/390/768/1024/1440 + Safari/Firefox/Chromium | No overflow, clipped text, invisible focus |

## No false security assurance
This is a **design/static review**, not proof that the full system has zero vulnerabilities. A robust production sign-off requires compiling and running the services, executing PostgreSQL migrations and concurrency tests, scanning dependencies/secrets, and testing a deployed build with the real OYS identity and storage integrations.

## Reference checklist
- https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Nextjs_Security_Cheat_Sheet.html
- https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html
