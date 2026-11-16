-- OYS E-Library: PostgreSQL 16+ baseline schema, migration V1.
-- Identity and subscriptions are owned by the EXISTING OYS platform.
-- student_id, college_id, actor_id are externally managed opaque identifiers; never client-trusted.
-- No destructive cascades on auditable progress, entitlements or reward data.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(96) NOT NULL UNIQUE,
  name varchar(140) NOT NULL,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by varchar(128) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sector_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT sector_name_not_blank CHECK (btrim(name) <> '')
);

CREATE TABLE subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id uuid NOT NULL REFERENCES sectors(id) ON DELETE RESTRICT,
  slug varchar(96) NOT NULL,
  title varchar(180) NOT NULL,
  description text,
  thumbnail_asset_id uuid, -- FK added after asset_objects declaration
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by varchar(128) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subject_slug_per_sector UNIQUE (sector_id,slug),
  CONSTRAINT subject_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT subject_title_not_blank CHECK (btrim(title) <> '')
);

CREATE TABLE asset_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_key varchar(768) NOT NULL UNIQUE,
  content_type varchar(128) NOT NULL,
  kind varchar(24) NOT NULL,
  bytes bigint NOT NULL,
  sha256 char(64) NOT NULL,
  scan_status varchar(20) NOT NULL DEFAULT 'PENDING',
  uploaded_by varchar(128) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT asset_kind_chk CHECK (kind IN ('THUMBNAIL','COVER','ORIGINAL','READER_PDF')),
  CONSTRAINT asset_scan_chk CHECK (scan_status IN ('PENDING','CLEAN','QUARANTINED','FAILED')),
  CONSTRAINT asset_bytes_chk CHECK (bytes > 0),
  CONSTRAINT asset_sha256_chk CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  CONSTRAINT asset_storage_key_chk CHECK (storage_key !~ '(^/|\.\.)')
);
ALTER TABLE subjects ADD CONSTRAINT subjects_thumbnail_asset_fk FOREIGN KEY (thumbnail_asset_id)
  REFERENCES asset_objects(id) ON DELETE RESTRICT;

CREATE TABLE materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  slug varchar(120) NOT NULL,
  title varchar(240) NOT NULL,
  summary varchar(512),
  description text,
  cover_asset_id uuid REFERENCES asset_objects(id) ON DELETE RESTRICT,
  access_tier varchar(12) NOT NULL,
  publication_status varchar(20) NOT NULL DEFAULT 'DRAFT',
  visibility_mode varchar(16) NOT NULL DEFAULT 'ALL_COLLEGES',
  published_version_id uuid,
  created_by varchar(128) NOT NULL,
  updated_by varchar(128),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  lock_version bigint NOT NULL DEFAULT 0,
  CONSTRAINT material_subject_slug_uq UNIQUE (subject_id,slug),
  CONSTRAINT material_slug_chk CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT material_title_chk CHECK (btrim(title) <> ''),
  CONSTRAINT material_access_chk CHECK (access_tier IN ('FREE','PREMIUM')),
  CONSTRAINT material_status_chk CHECK (publication_status IN ('DRAFT','PROCESSING','REVIEW_REQUIRED','PUBLISHED','ARCHIVED','PROCESSING_FAILED')),
  CONSTRAINT material_visibility_chk CHECK (visibility_mode IN ('ALL_COLLEGES','RESTRICTED')),
  CONSTRAINT material_published_version_chk CHECK (publication_status <> 'PUBLISHED' OR published_version_id IS NOT NULL),
  CONSTRAINT material_lock_version_chk CHECK (lock_version >= 0)
);

CREATE TABLE material_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  version_number integer NOT NULL,
  original_asset_id uuid NOT NULL REFERENCES asset_objects(id) ON DELETE RESTRICT,
  reader_asset_id uuid REFERENCES asset_objects(id) ON DELETE RESTRICT,
  process_state varchar(20) NOT NULL DEFAULT 'UPLOADED',
  source_format varchar(8) NOT NULL,
  total_page_count integer,
  eligible_page_count integer,
  toc_reviewed boolean NOT NULL DEFAULT false,
  eligibility_reviewed boolean NOT NULL DEFAULT false,
  processing_error_code varchar(120),
  reviewed_by varchar(128),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mv_number_uq UNIQUE (material_id,version_number),
  CONSTRAINT mv_material_id_uq UNIQUE (material_id,id),
  CONSTRAINT mv_state_chk CHECK (process_state IN ('UPLOADED','QUEUED','PROCESSING','REVIEW_REQUIRED','READY','FAILED')),
  CONSTRAINT mv_source_chk CHECK (source_format IN ('PDF','DOCX')),
  CONSTRAINT mv_pages_chk CHECK ((total_page_count IS NULL OR total_page_count > 0)
    AND (eligible_page_count IS NULL OR eligible_page_count >= 0)
    AND (total_page_count IS NULL OR eligible_page_count IS NULL OR eligible_page_count <= total_page_count)),
  CONSTRAINT mv_version_positive_chk CHECK (version_number > 0)
);
ALTER TABLE materials ADD CONSTRAINT materials_published_version_fk
  FOREIGN KEY (id,published_version_id) REFERENCES material_versions(material_id,id) DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE material_college_visibility (
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  college_id varchar(128) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (material_id,college_id),
  CONSTRAINT college_id_nonblank CHECK (btrim(college_id) <> '')
);

CREATE TABLE material_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES material_versions(id) ON DELETE RESTRICT,
  page_number integer NOT NULL,
  is_eligible boolean NOT NULL DEFAULT true,
  content_fingerprint char(64),
  eligibility_reason varchar(160),
  CONSTRAINT mp_version_number_uq UNIQUE (version_id,page_number),
  CONSTRAINT mp_version_id_uq UNIQUE (version_id,id),
  CONSTRAINT mp_page_positive_chk CHECK (page_number > 0),
  CONSTRAINT mp_fingerprint_chk CHECK (content_fingerprint IS NULL OR content_fingerprint ~ '^[a-f0-9]{64}$')
);

CREATE TABLE material_toc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES material_versions(id) ON DELETE RESTRICT,
  parent_id uuid,
  title varchar(300) NOT NULL,
  destination_page_id uuid NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  source varchar(18) NOT NULL DEFAULT 'EXTRACTED',
  is_reviewed boolean NOT NULL DEFAULT false,
  CONSTRAINT toc_version_id_uq UNIQUE (version_id,id),
  CONSTRAINT toc_parent_fk FOREIGN KEY (version_id,parent_id) REFERENCES material_toc(version_id,id) DEFERRABLE,
  CONSTRAINT toc_page_fk FOREIGN KEY (version_id,destination_page_id) REFERENCES material_pages(version_id,id),
  CONSTRAINT toc_source_chk CHECK (source IN ('EXTRACTED','HEURISTIC','ADMIN')),
  CONSTRAINT toc_title_chk CHECK (btrim(title) <> ''),
  CONSTRAINT toc_self_parent_chk CHECK (id IS DISTINCT FROM parent_id)
);
-- Cycles longer than one hop in TOC need an application-level/recursive trigger check.

CREATE TABLE material_page_mappings (
  old_page_id uuid NOT NULL REFERENCES material_pages(id) ON DELETE RESTRICT,
  new_page_id uuid NOT NULL REFERENCES material_pages(id) ON DELETE RESTRICT,
  mapping_method varchar(16) NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'PROPOSED',
  similarity_score numeric(5,4),
  reviewed_by varchar(128),
  reviewed_at timestamptz,
  PRIMARY KEY (old_page_id,new_page_id),
  CONSTRAINT map_method_chk CHECK (mapping_method IN ('EXACT_HASH','TEXT_MATCH','ADMIN')),
  CONSTRAINT map_status_chk CHECK (status IN ('PROPOSED','APPROVED','REJECTED')),
  CONSTRAINT map_similarity_chk CHECK (similarity_score IS NULL OR similarity_score BETWEEN 0 AND 1),
  CONSTRAINT map_diff_pages_chk CHECK (old_page_id <> new_page_id),
  CONSTRAINT map_approval_chk CHECK (status <> 'APPROVED' OR reviewed_by IS NOT NULL)
);
CREATE UNIQUE INDEX one_approved_old_page_map ON material_page_mappings(old_page_id) WHERE status = 'APPROVED';
CREATE UNIQUE INDEX one_approved_new_page_map ON material_page_mappings(new_page_id) WHERE status = 'APPROVED';

-- Grants evidence which FREE materials were opened before subscription expiry.
CREATE TABLE student_material_access (
  student_id varchar(128) NOT NULL,
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  college_id varchar(128) NOT NULL,
  access_basis varchar(24) NOT NULL,
  first_granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id,material_id),
  CONSTRAINT sma_basis_chk CHECK (access_basis IN ('FREE_AT_ACTIVE_SUBSCRIPTION','PREMIUM_ENTITLEMENT')),
  CONSTRAINT sma_student_chk CHECK (btrim(student_id) <> '')
);

CREATE TABLE reading_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id varchar(128) NOT NULL,
  material_id uuid NOT NULL,
  version_id uuid NOT NULL,
  active_page_id uuid,
  status varchar(12) NOT NULL DEFAULT 'ACTIVE',
  started_at timestamptz NOT NULL DEFAULT now(),
  last_heartbeat_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  FOREIGN KEY (material_id,version_id) REFERENCES material_versions(material_id,id),
  FOREIGN KEY (version_id,active_page_id) REFERENCES material_pages(version_id,id),
  CONSTRAINT rs_status_chk CHECK (status IN ('ACTIVE','CLOSED','EXPIRED')),
  CONSTRAINT rs_expiry_chk CHECK (expires_at > started_at)
);
CREATE UNIQUE INDEX one_active_reading_session_per_student ON reading_sessions(student_id) WHERE status = 'ACTIVE';

CREATE TABLE page_read_activity (
  session_id uuid NOT NULL REFERENCES reading_sessions(id) ON DELETE RESTRICT,
  page_id uuid NOT NULL REFERENCES material_pages(id) ON DELETE RESTRICT,
  validated_milliseconds integer NOT NULL DEFAULT 0,
  last_server_tick_at timestamptz,
  PRIMARY KEY (session_id,page_id),
  CONSTRAINT pra_time_chk CHECK (validated_milliseconds BETWEEN 0 AND 600000)
);

CREATE TABLE student_page_completions (
  student_id varchar(128) NOT NULL,
  material_id uuid NOT NULL,
  version_id uuid NOT NULL,
  page_id uuid NOT NULL,
  source varchar(12) NOT NULL DEFAULT 'READ',
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id,page_id),
  FOREIGN KEY (material_id,version_id) REFERENCES material_versions(material_id,id),
  FOREIGN KEY (version_id,page_id) REFERENCES material_pages(version_id,id),
  CONSTRAINT spc_source_chk CHECK (source IN ('READ','MIGRATED'))
);

CREATE TABLE student_material_progress (
  student_id varchar(128) NOT NULL,
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  current_version_id uuid NOT NULL,
  last_marked_page_id uuid,
  completed_page_count integer NOT NULL DEFAULT 0,
  status varchar(14) NOT NULL DEFAULT 'IN_PROGRESS',
  first_opened_at timestamptz NOT NULL DEFAULT now(),
  last_marked_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id,material_id),
  FOREIGN KEY (material_id,current_version_id) REFERENCES material_versions(material_id,id),
  FOREIGN KEY (current_version_id,last_marked_page_id) REFERENCES material_pages(version_id,id),
  CONSTRAINT smp_completed_nonnegative CHECK (completed_page_count >= 0),
  CONSTRAINT smp_status_chk CHECK (status IN ('IN_PROGRESS','COMPLETED')),
  CONSTRAINT smp_complete_timestamp_chk CHECK (status <> 'COMPLETED' OR completed_at IS NOT NULL)
);

CREATE TABLE student_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id varchar(128) NOT NULL,
  material_id uuid NOT NULL,
  version_id uuid NOT NULL,
  page_id uuid NOT NULL,
  note varchar(500),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (material_id,version_id) REFERENCES material_versions(material_id,id),
  FOREIGN KEY (version_id,page_id) REFERENCES material_pages(version_id,id),
  UNIQUE (student_id,page_id)
);

CREATE TABLE student_saved_materials (
  student_id varchar(128) NOT NULL,
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  saved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id,material_id)
);

-- The FREE access tier at first verified completion is snapshotted immutably.
CREATE TABLE qualifying_free_completions (
  student_id varchar(128) NOT NULL,
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  qualifying_version_id uuid NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  ordinal integer NOT NULL,
  access_tier_snapshot varchar(12) NOT NULL DEFAULT 'FREE',
  PRIMARY KEY (student_id,material_id),
  UNIQUE (student_id,ordinal),
  FOREIGN KEY (material_id,qualifying_version_id) REFERENCES material_versions(material_id,id),
  CONSTRAINT qfc_ordinal_positive CHECK (ordinal > 0),
  CONSTRAINT qfc_free_only CHECK (access_tier_snapshot = 'FREE')
);

CREATE TABLE student_reward_accounts (
  student_id varchar(128) PRIMARY KEY,
  qualifying_count integer NOT NULL DEFAULT 0,
  earned_credits integer NOT NULL DEFAULT 0,
  redeemed_credits integer NOT NULL DEFAULT 0,
  available_credits integer GENERATED ALWAYS AS (earned_credits - redeemed_credits) STORED,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reward_count_chk CHECK (qualifying_count >= 0),
  CONSTRAINT reward_balance_chk CHECK (earned_credits >= 0 AND redeemed_credits >= 0 AND earned_credits >= redeemed_credits),
  CONSTRAINT reward_earn_chk CHECK (earned_credits = qualifying_count / 3)
);

CREATE TABLE premium_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id varchar(128) NOT NULL,
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  status varchar(14) NOT NULL DEFAULT 'ACTIVE',
  UNIQUE (student_id,material_id),
  CONSTRAINT pe_status_chk CHECK (status IN ('ACTIVE','REVOKED'))
);

CREATE TABLE premium_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id varchar(128) NOT NULL REFERENCES student_reward_accounts(student_id) ON DELETE RESTRICT,
  kind varchar(8) NOT NULL,
  amount smallint NOT NULL,
  event_key varchar(160) NOT NULL UNIQUE,
  related_material_id uuid REFERENCES materials(id) ON DELETE RESTRICT,
  entitlement_id uuid REFERENCES premium_entitlements(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ledger_kind_chk CHECK (kind IN ('EARN','REDEEM')),
  CONSTRAINT ledger_sign_chk CHECK ((kind='EARN' AND amount=1) OR (kind='REDEEM' AND amount=-1)),
  CONSTRAINT ledger_reference_chk CHECK (kind <> 'REDEEM' OR entitlement_id IS NOT NULL)
);

CREATE TABLE premium_unlock_requests (
  student_id varchar(128) NOT NULL,
  idempotency_key varchar(128) NOT NULL,
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  entitlement_id uuid REFERENCES premium_entitlements(id),
  status varchar(12) NOT NULL DEFAULT 'IN_PROGRESS',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id,idempotency_key),
  CONSTRAINT pur_status_chk CHECK (status IN ('IN_PROGRESS','SUCCEEDED','FAILED'))
);

CREATE TABLE material_engagement_daily (
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  activity_date date NOT NULL,
  unique_readers integer NOT NULL DEFAULT 0,
  starts integer NOT NULL DEFAULT 0,
  completions integer NOT NULL DEFAULT 0,
  saves integer NOT NULL DEFAULT 0,
  PRIMARY KEY (material_id,activity_date),
  CONSTRAINT med_nonnegative_chk CHECK (unique_readers >= 0 AND starts >= 0 AND completions >= 0 AND saves >= 0)
);

CREATE TABLE material_trending_overrides (
  material_id uuid PRIMARY KEY REFERENCES materials(id) ON DELETE RESTRICT,
  action varchar(12) NOT NULL,
  expires_at timestamptz,
  reason varchar(512) NOT NULL,
  set_by varchar(128) NOT NULL,
  set_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trending_action_chk CHECK (action IN ('PIN','EXCLUDE'))
);

CREATE TABLE document_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES material_versions(id) ON DELETE RESTRICT,
  job_type varchar(20) NOT NULL,
  status varchar(14) NOT NULL DEFAULT 'QUEUED',
  attempts smallint NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error_code varchar(100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (version_id,job_type),
  CONSTRAINT job_type_chk CHECK (job_type IN ('CONVERT_AND_EXTRACT','REVISION_MAPPING')),
  CONSTRAINT job_status_chk CHECK (status IN ('QUEUED','RUNNING','SUCCEEDED','FAILED')),
  CONSTRAINT job_attempts_chk CHECK (attempts BETWEEN 0 AND 10)
);

CREATE TABLE admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id varchar(128) NOT NULL,
  action varchar(100) NOT NULL,
  entity_type varchar(100) NOT NULL,
  entity_id uuid,
  request_id varchar(128),
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

-- For real time searching, use a separate trigram or tsvector index when seeded.
CREATE INDEX idx_subjects_sector_order ON subjects(sector_id,display_order) WHERE is_active;
CREATE INDEX idx_materials_subject_publication ON materials(subject_id,publication_status,access_tier);
CREATE INDEX idx_materials_publication ON materials(publication_status,published_at DESC) WHERE publication_status='PUBLISHED';
CREATE INDEX idx_materials_title_search ON materials USING gin (to_tsvector('english',title || ' ' || coalesce(summary,'')));
CREATE INDEX idx_material_college_lookup ON material_college_visibility(college_id,material_id);
CREATE INDEX idx_pages_version_order ON material_pages(version_id,page_number);
CREATE INDEX idx_toc_version_order ON material_toc(version_id,display_order);
CREATE INDEX idx_sessions_student_recent ON reading_sessions(student_id,started_at DESC);
CREATE INDEX idx_completions_student_version ON student_page_completions(student_id,version_id);
CREATE INDEX idx_progress_student_recent ON student_material_progress(student_id,updated_at DESC);
CREATE INDEX idx_bookmarks_student ON student_bookmarks(student_id,created_at DESC);
CREATE INDEX idx_free_qualifications_student ON qualifying_free_completions(student_id,ordinal);
CREATE INDEX idx_ledger_student_recent ON premium_credit_ledger(student_id,created_at DESC);
CREATE INDEX idx_entitlements_student ON premium_entitlements(student_id,unlocked_at DESC);
CREATE INDEX idx_engagement_recent ON material_engagement_daily(activity_date DESC,material_id);
CREATE INDEX idx_jobs_next ON document_jobs(status,next_attempt_at) WHERE status IN ('QUEUED','FAILED');
CREATE INDEX idx_audit_actor_recent ON admin_audit_logs(actor_id,occurred_at DESC);

COMMENT ON TABLE student_reward_accounts IS 'Wallet totals must be changed only inside SERIALIZABLE/row-locked completion or redemption transactions; triggers may be added before production.';
COMMENT ON TABLE material_page_mappings IS 'Cross-version, same-material and eligible-page mapping rules validated by application service and migration review; SQL FK alone does not enforce them.';
COMMENT ON TABLE student_material_access IS 'Grant creation requires authoritative OYS subscription and material college visibility checks, not claims passed by the browser.';
