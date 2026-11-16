# v1.5 Addendum — PRD: Category Navigation and Pagination

**Current project addendum:** [06_CATEGORY_HIERARCHY_AND_PAGINATION.md](06_CATEGORY_HIERARCHY_AND_PAGINATION.md). Adopt **Sector → Category → optional Subcategory → Subject → Material** with V3 migration and safe bounded published-material paging; this supersedes the earlier direct `sectors → subjects` layout. Migration retains legacy subjects under a per-sector General category. The new catalogue API enforces active hierarchy and verified OYS `college_id` claim. Frontend screens remain sample-only until OYS login, college membership, and document integrations are available. The migration, Maven build and browser QA have **not** been verified at runtime here.

---

# OYS E-Library — Product Requirements Document (PRD)

**Version:** 1.3 | **Created:** 16 November 2026 | **Owner:** OYS Product | **Status:** 16 product decisions confirmed, five integration decisions open

## 1. Executive summary
A secure, online-only academic and career-study library embedded in Operation Yuva Sankalp (OYS), serving verified students of partner B.Tech colleges and a single OYS Super Admin. The application offers published materials within Engineering, IT, Private Jobs and Government Jobs; tracks deliberate page reading and grants one Premium material unlock for every three distinct completed Free materials.

## 2. User problems and objectives
Students need trustworthy, structured resources that are searchable, resumable, and easy to read on mobile/desktop, without losing reading state. Super Admin needs controlled content publishing, visibility by partner college, and meaningful completion and reward analytics.

**Objectives:** Discover relevant material quickly; navigate accurate TOC; retain completed pages across sessions; maintain clear separation between Free, Premium and Trending; award credits without fraud or duplication; preserve access entitlements; provide accessible minimal UI.

**Non-goals for v1:** Student file uploads, in-browser document editing, certificate issuance, paid checkout, social feeds, AI chatbot, OCR for arbitrary scanned PDFs, unrestricted file downloads, offline reading, and college-admin publishing.

## 3. Users & role scope
- **OYS Super Admin:** Only role allowed to create sectors/subjects, upload and revise materials, approve TOC/eligible pages, publish/archive and configure per-college access, manage Trending and view analytics.
- **Verified OYS Student:** Browse materials authorized for current college; search/filter; read online; view page-level progress; bookmark/save; complete Free materials; redeem credits and read unlocked Premium.
- **External OYS Identity/Subscription:** Existing provider governs JWT login, membership, subscription and status. E-Library does not own student passwords or college billing.

## 4. Information architecture
Sector → Subject → Material → Immutable Material Version → Pages & TOC. Subject has thumbnail/description; Material has cover/title/description/access tier/status/college visibility. Initial sectors: Engineering, IT, Private Jobs, Government Jobs. `access_tier` is FREE or PREMIUM; Trending is an independent discovery state, not a third tier.

## 5. Core flows and acceptance criteria

### F1 — Login and access (P0)
**Flow:** Student enters via existing OYS navigation/session; API validates current OYS JWT and college membership; route to E-Library. Super Admin enters separate secured admin route.
**Acceptance:** No public content API inadvertently exposes protected records. Student cannot call admin routes. Material search and file read each check college authorization. No separate E-Library password store.

### F2 — Admin sector and subject management (P0)
**Flow:** Admin creates sector, then subject with title/description/thumbnail; can update order and status.
**Acceptance:** Duplicated slug in same sector rejected; malformed image blocked; inactive subjects hidden from student catalogue.

### F3 — Admin material upload/publish (P0)
**Flow:** Create draft → set tier and college policy → upload cover/PDF/DOCX → scan/convert/extract TOC → review TOC and eligible pages → preview → publish.
**Acceptance:** PDF and DOCX converted to stable online PDF; no unscanned or failed material published; admin can edit headings/destinations, exclude non-learning pages and re-run processing; old version retained on revision.

### F4 — Student discovery and filters (P0)
**Flow:** E-Library nav → select sector/subject or search → All, Free, Premium, Trending, Saved, Unlocked filters → open card.
**Acceptance:** Show title, cover, short description, access badge and progress or lock state; server filters by college visibility; search paginated; Trending may include either tier.

### F5 — Online reader and TOC (P0)
**Flow:** Open authorized material → TOC sidebar + reader → navigate freely to any page.
**Acceptance:** TOC links jump to correct page; DOCX is safely preconverted; screen adapts to 360px+ widths with no horizontal page gap or content clipping; keyboard navigation and reduced-motion support.

### F6 — Verified reading progress (P0)
**Flow:** View eligible page actively for minimum 8 seconds → explicit Mark as Read → backend records page completion.
**Acceptance:** Scroll/Next/TOC jump never marks a page. Hidden/inactive tab pauses reading eligibility. A duplicate mark request does not increment progress. Completion reaches 100% only if all eligible pages are marked. Covers/front matter/TOC excluded by reviewed eligibility metadata.

### F7 — Resume, bookmarks and save (P0)
**Flow:** User closes/logout → returns → reader opens most recently marked page; can bookmark pages and save whole materials separately.
**Acceptance:** Persisted across devices; bookmark doesn't count as read; save doesn't count as read; last viewed-but-not-marked page does not override last marked page.

### F8 — Earn and redeem Premium credits (P0)
**Flow:** 3 distinct completed Free materials → one credit; continue for every 3; user uses available credit to immediately unlock an eligible Premium material.
**Acceptance:** Atomic, idempotent, no negative balance, no rereading duplicates, no double charge on retries. Earned credits survive document revisions, reclassification and archive. Existing entitlement retained through subscription expiry; no redemption while expired.

### F9 — Expired subscription handling (P0, policy sign-off required)
**Confirmed:** Continue reading existing materials and block new Premium unlocks.
**Proposed specific interpretation:** Existing=already-started Free materials plus previously unlocked Premium. Do not grant new Free starts after expiry. Keep progress, bookmarks, credits and entitlements for renewal. This precise interpretation must be confirmed before launch.

### F10 — Document revision (P1)
**Flow:** Admin uploads replacement → worker maps pages from old/new versions by fingerprint and normalized content → admin approves disputed changes.
**Acceptance:** Preserve progress only for verified unchanged pages; ambiguous/new content remains unread; no duplicate credits; track migration audit.

### F11 — Trending and analytics (P1)
**Flow:** Rank authorized published materials using 7-day unique readers, starts, completions and saves; Super Admin may pin/exclude with reason/expiration.
**Acceptance:** All views enforce college visibility. KPIs: published materials, active readers, unique completions, Free/Premium opens, credits earned/redeemed, popular subjects, processing failures.

## 6. UX and visual direction
**Personality:** Calm, scholarly, clean, minimal, human-designed. Use deep navy type, generous whitespace, thin borders, muted indigo accents, and restrained frosted glass panels with readable opaque text areas. Avoid artificial hero artwork, random gradients, fake charts, decorative icon clutter, bulky shadows, hover-jumping cards and unreadable transparency. Sidebar navigation and TOC must work at mobile widths. Use no remote assets by default. Contrast WCAG AA target, keyboard focus, labels, prefers-reduced-motion support.

**Required screens:** Student Home, sector listing, subject library, material details, reader + TOC/progress/bookmarks, saved/unlocked/reading history, premium wallet; Admin Dashboard, sector/subject management, upload wizard, TOC/eligibility review, college restrictions, material versions, analytics and audit.

## 7. Non-functional requirements
- **Security:** Bearer JWT verified by backend and gateway, authorization on every object, private object storage, safe upload and DOCX conversion, audit logging, nonnegative transactional wallet, rate limits, CSP and secure cookie/CSRF design during OYS BFF integration.
- **Privacy:** Minimize student personal data, keep stable external OYS IDs, restrict analytics; encrypted transit and at-rest backups.
- **Performance:** Server-paginated catalogue; load only visible PDF pages; avoid reader PDF memory spikes; cache scoped published metadata, not rewards.
- **Availability:** Durable document processing, retry/quarantine; backup/restore and incident monitoring.
- **Accessibility:** WCAG 2.2 AA aspiration; high-contrast reading canvas; keyboard TOC and clearly labeled controls.
- **Compatibility:** Latest maintained Chromium/Firefox/Safari/Edge; mobile responsive.

## 8. Data & API dependency summary
PostgreSQL tables and ERD: `backend/src/main/resources/db/migration/V1__core_schema.sql` + `V2__integrity_guards.sql`; service diagrams and invariants: `architecture/01_SYSTEM_DESIGN.md`; API outline: `architecture/03_API_CONTRACT.md`. Private object storage required; no PDF byte arrays in PostgreSQL. Existing OYS auth and subscription contracts required for integrated launch.

## 9. Proposed measurements
Search-to-open rate, completion per eligible opened material, resume usage, average distinct completed pages, credits earned/redeemed, active students by college, failed uploads, accessibility defects and security event counts. Avoid using pure time-on-page as a learning-outcome metric.

## 10. Release plan
1. Infrastructure + auth/college boundary + schema/migrations;
2. Admin content CRUD + storage + processing + TOC review;
3. Student catalogue + search + reader and bookmarks;
4. validated reading progress, re-entry and resume;
5. transactional Premium credits, entitlement and expiry rules;
6. analytics, trending and reliability/security tests.

## 11. Definition of Done / security release gate
- All P0 acceptance tests pass against a real OYS staging identity + college-subscription source.
- JWT validation, object-level access, college-specific visibility, upload safety and credit double-spend abuse tests pass.
- PostgreSQL migration runs cleanly on fresh and existing staging DB, constraints and indexes inspected, backup restore tested.
- Chrome/Firefox/Safari/Edge widths from 360px to 1440px show no horizontal overflow, overlapping panes, inaccessible controls or forced reloads.
- SBOM, dependency and secret scans run; critical/high findings resolved or formally accepted by security owners.
- A production threat-model review, load test and accessible-reader check completed.

## 12. Open business decisions / dependencies
A) OYS auth contract (issuer, audience, roles, student/college IDs, subscription API/events); B) exact "existing" reading entitlement on expired subscription; C) how to treat previously unlocked material when Super Admin revokes college visibility; D) maximum file sizes/pages and storage/licensing requirements; E) actual deployment topology/CI secrets and traffic SLOs. These are **not** assumed finalized by this PRD.
