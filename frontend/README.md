# OYS E-Library — Arctic Blue v1.5 Preview

The Student Home shows **sector → category → optional subcategory → subject → material**, keyword search, Free/Premium/Trending/Saved preview filters, sorting and 12/24/48 result pages. Filters reset the page index. Admin Dashboard has a category-structure overview, dependent Sector/Category/Subcategory/Subject selects in its upload preview, and a paginated materials table. The reader remains a demonstration, not a live PDF.js integration.

Colors: background `#F3F8FC`, accent `#3975A5`, text `#233A50`, support blue `#DCECF5`. Material covers are **static** original SVG technical diagrams. No GIFs, decorative AI-like marks, or animated material cards. Only navigation icon paths move subtly on hover/keyboard focus; reduced-motion requests are respected.

## Frontend environment file

From the repository root run `setup-env.cmd` (Windows) or `bash setup-env.sh` (macOS/Linux). These initialize `frontend/.env` and `backend/.env` without overwriting any existing file. Next.js reads `frontend/.env` automatically. Existing `.env.local` takes precedence. Keep database credentials and private JWT secrets out of frontend env files. See [ENV_SETUP.md](../ENV_SETUP.md).

## Development preview

```bash
cp .env.example .env.local
npm install
npm run dev
```

`OYS_PREVIEW_MODE=true` must only be enabled in a trusted local preview environment. Without that flag, all fixture routes return 404. These routes use **local illustrative data** and must not be publicly deployed as the live Super Admin or Student portal.

Offline initial-state snapshots can be regenerated with `node scripts/render-static-preview.cjs`; they are useful for markup inspection but have no React interactions.

## Not yet connected

The Spring Boot catalogue query and taxonomy-management endpoints are source-implemented, but real OYS login/college membership, secure BFF/cookie+CSRF contract, document uploads and scanning, PDF.js, persistent bookmarks/progress, premium credits, and Redis gateway integration remain pending. A future authenticated client must consume the real paginated API without passing untrusted `college_id` values.

Run `bash ../tests/run_offline_checks.sh` for current offline checks, and review `../QA_v1.5.md` for verification limits.
