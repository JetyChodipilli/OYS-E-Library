# OYS E-Library v1.5 — Category Hierarchy, Search and Pagination

## Navigation and schema

**Sector → Category → optional Subcategory → Subject → Learning Materials**. For example, IT → Programming Languages → (optional Backend Languages) → Java → Java Fundamentals. Free/Premium is an access tier, not a category. Trending is a discovery facet, not a category.

`V3__category_hierarchy_and_search.sql` creates `categories` (same-sector parent integrity, sibling slug uniqueness including root categories, max one subcategory level), adds `subjects.category_id NOT NULL`, and migrates all existing subjects into a `General` root category per sector. Admins can recategorize them later. No material/progress/credit rows are discarded. A material's subject remains its canonical home; duplication across categories is not used.

**Admin policy:** only OYS Super Admin may create/edit categories or assign subjects to categories. A deactivated category is hidden from student navigation; no hard deletion of referenced categories. Admin should not deactivate a category with active subjects or active subcategories without first moving or deactivating them. Publishing and asset upload remain unimplemented in v1.5.

## API contract

Authenticated OYS JWT required; reject unknown roles. API documentation details in `03_API_CONTRACT.md`.

- `GET /api/v1/elibrary/sectors`
- `GET /api/v1/elibrary/categories?sectorId=<uuid>` — active root/subcategories with parent id, in display order
- `GET /api/v1/elibrary/subjects?categoryId=<uuid>` — active subjects in that category (no implicit recursive broadening)
- `GET /api/v1/elibrary/materials?sectorId=&categoryId=&subjectId=&search=&accessType=FREE|PREMIUM&sort=RECENT|UPDATED|TITLE_ASC|TITLE_DESC&page=0&size=12`
- `POST /api/v1/elibrary/admin/categories` — Super Admin only
- `PUT /api/v1/elibrary/admin/categories/{id}` — Super Admin only; guarded depth and same-sector parent changes
- `POST /api/v1/elibrary/admin/subjects` — Super Admin only
- `PUT /api/v1/elibrary/admin/subjects/{id}/category` — Super Admin only

For the materials endpoint, `categoryId` includes that root category and its subcategory children. `subjectId` narrows further. Student material results are filtered to `PUBLISHED`, active taxonomy, and the `college_id` claim of the **validated OYS JWT**. When missing, reject the request, never fall back to a global catalogue. OYS Super Admin may see all published materials. The `collegeId`, `studentId`, and SQL sort expressions cannot be supplied by the browser. External OYS college membership / subscription validation remains a separate integration blocker; tokens must be issued and trusted by the existing OYS identity system.

The response contains: `content`, `page`, `size`, `totalElements`, `totalPages`, `hasNext`, `hasPrevious`. Page is zero-based, default size 12, maximum 48; use 12/24/48 in the UI. Sort SQL is strictly server-allowlisted. All filters use JDBC bound values. Search is trimmed, limited, parameterized, and `%/_/!` are treated as literal search characters. Counts and rows share the same filtering predicate.

## UX

Student Home: sector tiles, category/subcategory chips and subject selector, search, Free/Premium/Trending/Saved preview filters, sort selector, 12/24/48 page-size selector, and Previous/Next with current page and total count. Filter changes reset to page 1; pagination never requires horizontal scrolling. Material cards retain the approved Arctic Blue palette and static thumbnails. Admin Dashboard: paginated sample material list and a category-management *preview*; the real API requires a verified Super Admin JWT and is not called from the unprotected demo route.

## Existing feature gaps unaffected by this change

JWT issuer/college integration, Super Admin frontend route protection, PDF.js streaming, uploads/scanning, TOC extraction, durable reading progress and premium credits, Redis gateway/rate limiting, and live browser/security testing are still outstanding. Do not deploy sample dashboards as authenticated production screens.
