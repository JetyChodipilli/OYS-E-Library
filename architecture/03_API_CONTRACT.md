# OYS E-Library API Contract — v1.5 taxonomy addendum

For current implemented taxonomy and pagination endpoints, see [06_CATEGORY_HIERARCHY_AND_PAGINATION.md](06_CATEGORY_HIERARCHY_AND_PAGINATION.md). This addendum supersedes the original v1 **subject listing** and **material pagination** signatures below. Previous planned routes remain design-only unless explicitly listed as implemented.

# OYS E-Library API Contract — v1 design

Base URL: `/api/v1/elibrary`. All endpoints require an existing OYS JWT except liveness/health. The frontend must not pass authoritative `student_id`, `college_id` or role. All mutating requests validate JSON schema/body size and use `application/problem+json` error responses. Creation uses `201`, conflicts `409`, invalid input `400/422`, not found or unauthorized object `404` to avoid enumeration, unauthenticated `401`, prohibited role `403`, rate limit `429`.

## Existing OYS identity (external; do not duplicate endpoints)
`/login`, `/refresh`, `/logout`, session and subscription state are owned by OYS. E-Library validates signature, issuer, audience and roles. Exact auth integration cannot be implemented without OYS contract.

## Super Admin routes
|Verb|Path|Meaning|
|---|---|---|
|GET/POST|`/admin/sectors`|List/create sectors|
|PATCH|`/admin/sectors/{id}`|Edit sector|
|POST|`/admin/subjects`|Create subject (implemented in v1.5; runtime pending)|
|PUT|`/admin/subjects/{id}/category`|Move subject to category (implemented in v1.5; runtime pending)|
|POST/PUT|`/admin/categories[/{id}]`|Create/update category (implemented in v1.5; runtime pending)|
|POST/PATCH|`/admin/materials[/{id}]`|Create/update draft|
|POST|`/admin/materials/{id}/versions/uploads`|Begin signed private upload|
|POST|`/admin/materials/{id}/versions/{versionId}/finalize-upload`|Verify storage hash + queue scan/conversion|
|GET|`/admin/materials/{id}/versions/{versionId}/processing-status`|Processing state|
|PUT|`/admin/materials/{id}/versions/{versionId}/toc`|Review/correct TOC|
|PUT|`/admin/materials/{id}/versions/{versionId}/page-eligibility`|Approve eligible pages|
|POST|`/admin/materials/{id}/versions/{versionId}/publish`|Atomic publish pointer change|
|POST|`/admin/materials/{id}/archive`|Archive, preserve audit|
|PUT|`/admin/materials/{id}/college-access`|Replace visibility allowlist|
|PUT|`/admin/materials/{id}/trending-override`|Pin/exclude/auto|
|GET|`/admin/analytics/overview`|Dashboard|
|GET|`/admin/audit-logs`|Admin audit|

## Student routes
|Verb|Path|Meaning|
|---|---|---|
|GET|`/sectors`|Published sectors|
|GET|`/categories?sectorId=UUID`|College-scoped active categories (implemented in v1.5; runtime pending)|
|GET|`/subjects?categoryId=UUID`|College-scoped active subjects (implemented in v1.5; runtime pending)|
|GET|`/materials?search=&sectorId=&categoryId=&subjectId=&accessType=&sort=RECENT&page=0&size=12`|College-scoped paginated materials (implemented in v1.5; runtime pending; Trending pending)|
|GET|`/materials/{id}`|Authorized metadata|
|GET|`/materials/{id}/toc`|Approved TOC|
|GET|`/materials/{id}/reader`|Reader status, page count, last marked page|
|GET|`/materials/{id}/reader-file`|Authenticated PDF streaming with HTTP Range|
|POST|`/materials/{id}/reading-sessions`|Open session; retire previous active session|
|POST|`/reading-sessions/{id}/heartbeat`|Active page and visibility hints; server clamps duration|
|POST|`/materials/{id}/pages/{pageId}/mark-read`|Idempotent completion after validated >=8s|
|GET|`/me/materials/{id}/progress`|Resume and percent|
|GET/POST/DELETE|`/me/bookmarks[/id]`|Bookmark CRUD|
|GET/POST/DELETE|`/me/saved-materials[/{id}]`|Saved list CRUD|
|GET|`/me/premium-wallet`|Balance/next reward progress|
|GET|`/me/premium-entitlements`|Unlocked materials|
|GET|`/me/premium-transactions`|Credit history|
|POST|`/me/premium-unlocks`|Redeem; requires `Idempotency-Key`|

**Credit redeem payload**: `{ "materialId": "uuid" }`. **Response**: `{ "entitlementId": "uuid", "remainingCredits": 0, "materialId": "uuid" }`. Repeat same `Idempotency-Key` with different `materialId` returns `409`.

## Implementation status of starter
Implemented in source: sector list/create, category list/create/update, subject list/create/move, and paginated material list with role and college-visibility checks. **These new APIs have not passed Maven runtime tests or PostgreSQL migration tests in this environment.** All remaining routes above are **API design only**. The Next.js screens remain explicit demo fixtures, not authenticated API clients.
