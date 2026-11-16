-- V4: Published versions remain immutable, even after supersession.
-- Additive only; Flyway requires review and an actual PostgreSQL integration test before deployment.
ALTER TABLE material_versions ADD COLUMN first_published_at timestamptz;
UPDATE material_versions v SET first_published_at = COALESCE(m.published_at,now())
FROM materials m WHERE m.published_version_id=v.id AND m.publication_status='PUBLISHED';

CREATE OR REPLACE FUNCTION oys_stamp_published_version()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.publication_status='PUBLISHED' AND NEW.published_version_id IS NOT NULL THEN
    UPDATE material_versions SET first_published_at=COALESCE(first_published_at,now())
    WHERE id=NEW.published_version_id AND first_published_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_stamp_published_version
AFTER INSERT OR UPDATE OF publication_status,published_version_id ON materials
FOR EACH ROW EXECUTE FUNCTION oys_stamp_published_version();

CREATE OR REPLACE FUNCTION oys_deny_published_version_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.first_published_at IS NOT NULL THEN
    RAISE EXCEPTION 'A previously published version is immutable; upload a new version'
      USING ERRCODE='23514';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_immutable_published_version
BEFORE UPDATE OR DELETE ON material_versions
FOR EACH ROW EXECUTE FUNCTION oys_deny_published_version_mutation();

CREATE OR REPLACE FUNCTION oys_guard_published_child_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_version uuid;
BEGIN
  target_version := CASE WHEN TG_OP='DELETE' THEN OLD.version_id ELSE NEW.version_id END;
  IF EXISTS (SELECT 1 FROM material_versions v
    WHERE v.id=target_version AND v.first_published_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Published page and TOC records are immutable; create a revision'
      USING ERRCODE='23514';
  END IF;
  IF TG_OP='UPDATE' AND EXISTS (SELECT 1 FROM material_versions v
    WHERE v.id=OLD.version_id AND v.first_published_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Published document children cannot move between versions'
      USING ERRCODE='23514';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_immutable_published_pages
BEFORE INSERT OR UPDATE OR DELETE ON material_pages
FOR EACH ROW EXECUTE FUNCTION oys_guard_published_child_mutation();
CREATE TRIGGER trg_immutable_published_toc
BEFORE INSERT OR UPDATE OR DELETE ON material_toc
FOR EACH ROW EXECUTE FUNCTION oys_guard_published_child_mutation();

-- Require a review decision on every TOC entry when publishing a version.
CREATE OR REPLACE FUNCTION oys_require_reviewed_toc()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.publication_status='PUBLISHED' AND NEW.published_version_id IS NOT NULL
     AND EXISTS(SELECT 1 FROM material_toc t
                WHERE t.version_id=NEW.published_version_id AND NOT t.is_reviewed) THEN
    RAISE EXCEPTION 'Every published TOC entry must be reviewed' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_require_reviewed_toc
BEFORE INSERT OR UPDATE OF publication_status,published_version_id ON materials
FOR EACH ROW EXECUTE FUNCTION oys_require_reviewed_toc();

-- If a previously clean file is flagged as unsafe, archive current publications
-- referencing that asset. Never erase historic progress or entitlements.
CREATE OR REPLACE FUNCTION oys_archive_unsafe_asset()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.scan_status <> 'CLEAN' AND OLD.scan_status='CLEAN' THEN
    UPDATE materials m SET publication_status='ARCHIVED',updated_at=now()
    WHERE m.publication_status='PUBLISHED' AND (
      m.cover_asset_id=NEW.id OR EXISTS (
        SELECT 1 FROM material_versions v WHERE v.id=m.published_version_id
          AND (v.original_asset_id=NEW.id OR v.reader_asset_id=NEW.id)));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_archive_unsafe_asset
AFTER UPDATE OF scan_status ON asset_objects
FOR EACH ROW EXECUTE FUNCTION oys_archive_unsafe_asset();

-- Scan-clean assets are immutable as objects. If bytes/content must change,
-- create a new object and reprocess the material. Quarantine transitions are allowed.
CREATE OR REPLACE FUNCTION oys_guard_clean_asset_metadata()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.scan_status='CLEAN' AND (
    NEW.storage_key IS DISTINCT FROM OLD.storage_key OR
    NEW.content_type IS DISTINCT FROM OLD.content_type OR
    NEW.kind IS DISTINCT FROM OLD.kind OR
    NEW.bytes IS DISTINCT FROM OLD.bytes OR
    NEW.sha256 IS DISTINCT FROM OLD.sha256 OR
    NEW.uploaded_by IS DISTINCT FROM OLD.uploaded_by
  ) THEN
    RAISE EXCEPTION 'Clean asset metadata is immutable; create a new asset'
      USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_clean_asset_immutable
BEFORE UPDATE ON asset_objects
FOR EACH ROW EXECUTE FUNCTION oys_guard_clean_asset_metadata();

-- Publishing must reference correctly typed clean source, reader and cover assets.
-- Also prevents re-publishing with an unsafe cover after it has been quarantined.
CREATE OR REPLACE FUNCTION oys_require_clean_published_assets()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.publication_status='PUBLISHED' THEN
    IF NEW.cover_asset_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM asset_objects c WHERE c.id=NEW.cover_asset_id
        AND c.kind='COVER' AND c.scan_status='CLEAN'
        AND c.content_type IN ('image/png','image/jpeg','image/webp')
    ) THEN
      RAISE EXCEPTION 'Publishing requires a scan-clean static cover image'
        USING ERRCODE='23514';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM material_versions v
      JOIN asset_objects source ON source.id=v.original_asset_id
      JOIN asset_objects reader ON reader.id=v.reader_asset_id
      WHERE v.material_id=NEW.id AND v.id=NEW.published_version_id
        AND source.kind='ORIGINAL' AND source.scan_status='CLEAN'
        AND reader.kind='READER_PDF' AND reader.scan_status='CLEAN'
        AND reader.content_type='application/pdf'
    ) THEN
      RAISE EXCEPTION 'Published document must have clean, correctly typed source and reader assets'
        USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_clean_published_assets
BEFORE INSERT OR UPDATE OF publication_status,published_version_id,cover_asset_id ON materials
FOR EACH ROW EXECUTE FUNCTION oys_require_clean_published_assets();
