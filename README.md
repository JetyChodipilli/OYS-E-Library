> **v1.6 notice:** A security, quality, and schema-integrity hardening pass is available in [README_V1.6.md](README_V1.6.md) and [QA_v1.6.md](QA_v1.6.md). The application is still incomplete and must not be deployed to production.

## Import as Maven in Eclipse / STS

The repository now has a root [`pom.xml`](pom.xml) Maven aggregator that includes the [`backend`](backend/pom.xml) Spring Boot module. Use **File → Import → Maven → Existing Maven Projects**, select the repository root, and import both POMs. The Next.js [`frontend`](frontend/) is a separate npm project, not a Maven module. See [IMPORT_ECLIPSE.md](IMPORT_ECLIPSE.md) for detailed troubleshooting.

## Configure backend and frontend environment

Run `setup-env.cmd` at the repository root on Windows or `bash setup-env.sh` on macOS/Linux to create **local, Git-ignored** `backend/.env` and `frontend/.env` files without overwriting existing secrets. Edit the backend file with your real PostgreSQL and OYS identity provider settings. Spring Boot now explicitly imports the backend `.env` when started from the repository root or backend directory; Next.js automatically reads the frontend `.env`. See [ENV_SETUP.md](ENV_SETUP.md) for exact Eclipse/STS and CMD instructions. **No real credentials are stored in GitHub.**

# OYS E-Library — v1.5 Project Update

**Scope of this release:** category/subcategory taxonomy, safe data migration, authenticated backend list and admin taxonomy APIs, catalogue search/sort/pagination, Arctic Blue Student and Admin demo navigation, and regression checks.

**This is not a complete production application.** The frontend still uses sample materials. Secure OYS browser authentication, document upload/streaming, persistent reader progress, premium credits, refresh tokens, Redis gateway/rate limiting and deployment integration remain outstanding.

## File map

- `architecture/06_CATEGORY_HIERARCHY_AND_PAGINATION.md`: new navigation business rules, page contract, migration and security decisions.
- `architecture/01_SYSTEM_DESIGN.md` to `05_SCHEMA_DICTIONARY.md`: previous baseline documents with v1.5 addenda.
- `backend/src/main/resources/db/migration/V1__core_schema.sql`, `V2__integrity_guards.sql`, `V3__category_hierarchy_and_search.sql`: additive Flyway migrations (PostgreSQL 16+).
- `backend/src/main/java/com/oys/elibrary/catalog/`: sectors, categories, subjects and paginated published-material catalogue reads.
- `backend/src/main/java/com/oys/elibrary/admin/`: Super Admin sector/category/subject creation and changes.
- `frontend/components/`: Arctic Blue Student, Reader and Admin previews; material cards use local static SVG cover assets.
- `frontend/lib/cataloguePagination.ts`: deterministic fixture filtering, sorting and pagination logic.
- `tests/run_offline_checks.sh`: regression tests that run without backend infrastructure.
- `QA_v1.5.md`: verified and blocked checks, open security and feature gaps.

## Hierarchy and access rules

**Sector → Category → optional Subcategory → Subject → Material**. Categories are limited to one subcategory level. Subject-to-category assignment is mandatory and same-sector enforced. V3 creates a `General` category for every existing sector and moves legacy subjects there, preserving material IDs and learning history.

Free and Premium remain material access tiers. Trending is a separate discovery facet. Student material/taxonomy read APIs only expose published records visible to the student's `college_id` from a validated OYS JWT; a missing verified college claim fails closed. Super Admin actions require `ROLE_OYS_SUPER_ADMIN`.

## API endpoints implemented in source (runtime verification pending)

- `GET /api/v1/elibrary/sectors`
- `GET /api/v1/elibrary/categories?sectorId=<UUID>`
- `GET /api/v1/elibrary/subjects?categoryId=<UUID>`
- `GET /api/v1/elibrary/materials?sectorId=&categoryId=&subjectId=&accessType=FREE&search=java&sort=RECENT&page=0&size=12`
- `POST /api/v1/elibrary/admin/sectors`
- `POST /api/v1/elibrary/admin/categories`
- `PUT /api/v1/elibrary/admin/categories/{id}`
- `POST /api/v1/elibrary/admin/subjects`
- `PUT /api/v1/elibrary/admin/subjects/{id}/category`

`GET /materials` uses zero-based pagination, default size 12, maximum size 48; allowed sort modes are `RECENT`, `UPDATED`, `TITLE_ASC`, `TITLE_DESC`. Filtering, counts and paginated reads are performed in PostgreSQL, not client-side (once connected). The currently shipped Next.js screens use fixture data because the existing OYS browser authentication/session contract is not supplied yet.

## Local preview (development only)

```bash
cd frontend
cp .env.example .env.local
npm install
npm run typecheck
npm run dev
# browse http://localhost:3000
```

The `OYS_PREVIEW_MODE=true` environment variable is required to view fixture pages. They return 404 without it. **Never enable this flag in production.** Offline HTML render snapshots are available at `frontend/student.html`, `frontend/reader.html`, `frontend/admin.html`; these are not interactive React builds.

## Backend environment

Requires Java 21+, Maven, PostgreSQL 16+, and the **actual existing OYS** identity/JWKS/role/college claims contract. Set `OYS_DB_URL`, `OYS_DB_USER`, `OYS_DB_PASSWORD`, `OYS_JWT_ISSUER`, `OYS_JWKS_URI` and `OYS_JWT_AUDIENCE` from secret management. Apply V1 → V2 → V3 through Flyway and run `mvn test` before deployment. Use a Flyway migration role distinct from the runtime role. Do not issue real tokens locally or bypass authorization just to preview an API.

## Offline tests

```bash
bash tests/run_offline_checks.sh
```

This runs the repaired Python source/SQL contract checker, standalone TypeScript catalogue tests, and initial-state static HTML snapshot generation. It does **not** run real Spring Boot, PostgreSQL, Next.js, or browser tests. See `QA_v1.5.md` for the exact status and outstanding production blockers.
