# v1.5 Addendum — Schema Dictionary: Category Navigation and Pagination

**Current project addendum:** [06_CATEGORY_HIERARCHY_AND_PAGINATION.md](06_CATEGORY_HIERARCHY_AND_PAGINATION.md). Adopt **Sector → Category → optional Subcategory → Subject → Material** with V3 migration and safe bounded published-material paging; this supersedes the earlier direct `sectors → subjects` layout. Migration retains legacy subjects under a per-sector General category. The new catalogue API enforces active hierarchy and verified OYS `college_id` claim. Frontend screens remain sample-only until OYS login, college membership, and document integrations are available. The migration, Maven build and browser QA have **not** been verified at runtime here.

---

# OYS E-Library — Database Schema Dictionary

**Engine:** PostgreSQL 16 or newer · **Migrations:** `V1__core_schema.sql`, `V2__integrity_guards.sql` · **Identifiers:** UUID for internal rows, opaque strings for external OYS IDs.

## 1. Modeling principles
- `sectors → subjects → materials → material_versions → material_pages` represents learning content. One `materials.published_version_id` points to exactly one immutable version in the **same material** (composite FK).
- A material is **FREE** or **PREMIUM**; Trending is a separate computed ranking with a manual override, not a material tier.
- Student, college, OYS roles and subscription are **external** and canonicalized by OYS. The E-Library never stores passwords or trusts student/college IDs from the request body.
- `material_college_visibility` is an allowlist only when `visibility_mode='RESTRICTED'`. All authorization queries filter on role, student's current college, publication and subscription state.
- All meaningful student histories and financial-like reward events are preserved. No cascading delete of completion or ledger records.

## 2. Content domain tables
| Table | Primary key | Relationships and rules |
|---|---|---|
| `sectors` | `id` UUID | Unique URL slug; name/description/order/active status; created by Super Admin. |
| `subjects` | `id` UUID | `sector_id → sectors`; unique `(sector_id, slug)`; subject thumbnail references `asset_objects`. |
| `materials` | `id` UUID | `subject_id → subjects`; unique `(subject_id, slug)`; `access_tier=FREE/PREMIUM`, publication status, cover asset, visibility mode and published version FK. |
| `material_versions` | `id` UUID | `material_id → materials`; unique `(material_id,version_number)`; original and normalized reading assets, document state, page counts and review flags. |
| `asset_objects` | `id` UUID | Private storage path + SHA-256, MIME, bytes, kind and scan status. No raw file bytes in SQL. |
| `material_pages` | `id` UUID | `version_id → material_versions`; unique `(version_id,page_number)`; `is_eligible` and content fingerprint. |
| `material_toc` | `id` UUID | `(version_id,destination_page_id) → material_pages`; version-scoped parent FK and V2 cycle check. |
| `material_college_visibility` | `(material_id,college_id)` | College allowlist for restricted materials, uses opaque OYS college ID. |
| `material_page_mappings` | `(old_page_id,new_page_id)` | Cross-version progress transfer suggestions, admin-reviewed, V2 enforces same material and eligible pages. |
| `document_jobs` | `id` UUID | Durable document conversion and revision mapping jobs; worker retries. |

## 3. Student reading domain tables
| Table | Primary key | Relationships and rules |
|---|---|---|
| `student_material_access` | `(student_id,material_id)` | Server-issued historical grant to define "existing material" after expiry. |
| `reading_sessions` | `id` UUID | One active session per student, active page belongs to version; close stale sessions before creating new. |
| `page_read_activity` | `(session_id,page_id)` | Bounded accumulated server-validated milliseconds, last heartbeat timestamp. |
| `student_page_completions` | `(student_id,page_id)` | Immutable page completion and source (`READ` or `MIGRATED`); V2 rejects ineligible pages. |
| `student_material_progress` | `(student_id,material_id)` | Current version, last successfully marked page, cached completed count and material status. |
| `student_bookmarks` | `id` UUID | `(student_id,page_id)` unique; bookmarks independent of page completion. |
| `student_saved_materials` | `(student_id,material_id)` | Saved-material relation independent of bookmarks. |

## 4. Premium and analytics domain tables
| Table | Primary key | Relationships and rules |
|---|---|---|
| `qualifying_free_completions` | `(student_id,material_id)` | Immutable once per material, records ordinal and FREE tier snapshot. |
| `student_reward_accounts` | `student_id` | Transaction-locked wallet; `earned_credits = qualifying_count / 3`; generated available balance = earned - redeemed, nonnegative. |
| `premium_credit_ledger` | `id` UUID | Immutable +1 earn / -1 redeem rows with globally unique event key, student and entitlement refs. |
| `premium_unlock_requests` | `(student_id,idempotency_key)` | Deduplicates repeated redemption requests and rejects key reuse for other material. |
| `premium_entitlements` | `id` UUID | `(student_id,material_id)` unique; persistent unlock record even when subscription expires. |
| `material_engagement_daily` | `(material_id,activity_date)` | Aggregated distinct readers, starts, completions and saves. |
| `material_trending_overrides` | `material_id` | Admin PIN/EXCLUDE override with reason and optional expiration. |
| `admin_audit_logs` | `id` UUID | Immutable-in-practice change/event records; payload must omit passwords, bearer tokens, full file content. |

## 5. Critical transaction pseudocode

### Mark an eligible page read
1. Authenticate OYS Student, resolve student's authoritative college and subscription/entitlement rights; verify published material version and allowed page.
2. Lock the active `reading_sessions` row and ensure page is actively viewed, with >=8,000 server-validated milliseconds. Ignore client clock.
3. `INSERT student_page_completions (...) ON CONFLICT DO NOTHING`. On inserted row, recompute/adjust `student_material_progress` in same transaction and update `last_marked_page_id`.
4. If all eligible pages are complete, mark material complete. If material access tier at first verified completion is FREE, attempt one `qualifying_free_completions` row with unique `(student_id,material_id)`.
5. Lock `student_reward_accounts` row; allocate the next ordinal; if ordinal modulo 3 = 0, increment earned_credits, append +1 ledger entry with unique `event_key`.
6. Commit. Retrying the same completion must return prior state without changing reward.

### Redeem Premium credit
1. Authenticate Student, verify active OYS subscription, published Premium material, college visibility and idempotency key.
2. In transaction lock `student_reward_accounts FOR UPDATE`; reject insufficient credits and conflicting idempotency-key reuse.
3. `INSERT premium_entitlements ... ON CONFLICT DO NOTHING`; if prior entitlement exists, return existing without charging again.
4. Increment redeemed_credits, add -1 immutable ledger row with event key and entitlement id; mark request success; commit.
5. Enforce per-user transaction serializability with row lock; test simultaneous redemptions of one last credit.

## 6. Important query guards
```sql
-- Example catalogue authorization fragment (in addition to current OYS
-- subscription and role policies, not a complete endpoint implementation):
SELECT m.id, m.title, m.access_tier
FROM materials m
JOIN subjects s ON s.id=m.subject_id AND s.is_active
JOIN sectors x ON x.id=s.sector_id AND x.is_active
WHERE m.publication_status='PUBLISHED'
  AND (
    m.visibility_mode='ALL_COLLEGES'
    OR EXISTS (
      SELECT 1 FROM material_college_visibility v
      WHERE v.material_id=m.id AND v.college_id=:trusted_oys_college_id
    )
  )
ORDER BY m.published_at DESC, m.id DESC
LIMIT :capped_page_size;
```

## 7. Database-level validation decisions
- V2 enforces scanned/approved document version before publish, nonzero eligible pages and matching page counts, valid TOC, and restricted-college allowlist.
- V2 rejects cross-material/different-eligibility page mappings and TOC loops.
- Page completion and credit history are immutable to preserve rewards and auditability.
- Application still must enforce **which** OYS student owns operations, OYS subscription state, page-reading time, current college, premium access and row-lock transaction ordering. Database constraints alone cannot solve BOLA/IDOR.

## 8. Remaining DB migration QA
Run migrations against real PostgreSQL 16+ in a disposable staging DB, inspect all foreign keys with `pg_constraint`, exercise V2 trigger failure cases, run 100 concurrent redeem/mark requests, verify backup/restore, and validate least-privilege runtime DB role. Offline static checks are not a substitute for this.
