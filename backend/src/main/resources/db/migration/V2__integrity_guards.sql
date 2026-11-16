-- Additional database guards. Application authorization and transactions remain mandatory.

-- Prevent impossible progress data, even if an application service contains a bug.
CREATE OR REPLACE FUNCTION oys_check_eligible_page_completion()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE eligible boolean;
BEGIN
  SELECT p.is_eligible INTO eligible FROM material_pages p WHERE p.id = NEW.page_id;
  IF eligible IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Cannot complete a non-eligible learning page' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_page_completion_eligible
BEFORE INSERT OR UPDATE OF page_id ON student_page_completions
FOR EACH ROW EXECUTE FUNCTION oys_check_eligible_page_completion();

-- A migrated page can only correspond to the same material, in a new version.
CREATE OR REPLACE FUNCTION oys_check_page_mapping()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE old_mat uuid; new_mat uuid; old_ver uuid; new_ver uuid;
        old_eligible boolean; new_eligible boolean;
        old_hash char(64); new_hash char(64);
BEGIN
  SELECT v.material_id,p.version_id,p.is_eligible,p.content_fingerprint
    INTO old_mat,old_ver,old_eligible,old_hash
    FROM material_pages p JOIN material_versions v ON v.id=p.version_id WHERE p.id=NEW.old_page_id;
  SELECT v.material_id,p.version_id,p.is_eligible,p.content_fingerprint
    INTO new_mat,new_ver,new_eligible,new_hash
    FROM material_pages p JOIN material_versions v ON v.id=p.version_id WHERE p.id=NEW.new_page_id;
  IF old_mat IS NULL OR new_mat IS NULL OR old_mat <> new_mat OR old_ver = new_ver THEN
    RAISE EXCEPTION 'Page mapping must link distinct versions of one material' USING ERRCODE='23514';
  END IF;
  IF old_eligible IS DISTINCT FROM true OR new_eligible IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Only eligible pages may migrate reading progress' USING ERRCODE='23514';
  END IF;
  IF NEW.mapping_method='EXACT_HASH' AND
      (old_hash IS NULL OR new_hash IS NULL OR old_hash <> new_hash) THEN
    RAISE EXCEPTION 'EXACT_HASH requires identical non-null page fingerprint' USING ERRCODE='23514';
  END IF;
  IF NEW.status='APPROVED' AND (NEW.reviewed_by IS NULL OR NEW.reviewed_at IS NULL) THEN
    RAISE EXCEPTION 'An approved mapping requires an audit reviewer and date' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_page_mapping_valid
BEFORE INSERT OR UPDATE ON material_page_mappings
FOR EACH ROW EXECUTE FUNCTION oys_check_page_mapping();

-- Recursive TOC ancestry cannot form a cycle.
CREATE OR REPLACE FUNCTION oys_check_toc_cycle()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE would_cycle boolean;
BEGIN
  IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;
  WITH RECURSIVE ancestors(id,parent_id) AS (
      SELECT id,parent_id FROM material_toc WHERE id=NEW.parent_id AND version_id=NEW.version_id
      UNION ALL
      SELECT p.id,p.parent_id FROM material_toc p JOIN ancestors a ON p.id=a.parent_id
      WHERE p.version_id=NEW.version_id
  )
  SELECT EXISTS(SELECT 1 FROM ancestors WHERE id=NEW.id) INTO would_cycle;
  IF would_cycle THEN
    RAISE EXCEPTION 'TOC cannot contain a parent cycle' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_toc_acyclic
BEFORE INSERT OR UPDATE OF parent_id,version_id ON material_toc
FOR EACH ROW EXECUTE FUNCTION oys_check_toc_cycle();

-- Recheck all essential publishing conditions at transaction boundary.
CREATE OR REPLACE FUNCTION oys_guard_publish()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r record; actual_pages integer; actual_eligible integer; toc_items integer;
        allowed_colleges integer;
BEGIN
  IF NEW.publication_status <> 'PUBLISHED' THEN RETURN NEW; END IF;
  IF NEW.published_version_id IS NULL THEN
    RAISE EXCEPTION 'No published version chosen' USING ERRCODE='23514';
  END IF;
  SELECT v.process_state, v.toc_reviewed, v.eligibility_reviewed,
         v.total_page_count, v.eligible_page_count,
         v.reader_asset_id, o.scan_status AS original_scan, a.scan_status AS reader_scan
    INTO r
    FROM material_versions v
    JOIN asset_objects o ON o.id=v.original_asset_id
    LEFT JOIN asset_objects a ON a.id=v.reader_asset_id
    WHERE v.id=NEW.published_version_id AND v.material_id=NEW.id;
  IF NOT FOUND OR r.process_state <> 'READY' OR r.toc_reviewed IS DISTINCT FROM true
     OR r.eligibility_reviewed IS DISTINCT FROM true OR r.reader_asset_id IS NULL
     OR r.original_scan <> 'CLEAN' OR r.reader_scan IS DISTINCT FROM 'CLEAN' THEN
    RAISE EXCEPTION 'Material version is not ready, reviewed and scan-clean' USING ERRCODE='23514';
  END IF;
  SELECT count(*),count(*) FILTER (WHERE is_eligible) INTO actual_pages,actual_eligible
    FROM material_pages WHERE version_id=NEW.published_version_id;
  IF actual_pages <> r.total_page_count OR actual_eligible <> r.eligible_page_count
     OR actual_eligible <= 0 THEN
    RAISE EXCEPTION 'Page count metadata does not match reviewed pages' USING ERRCODE='23514';
  END IF;
  SELECT count(*) INTO toc_items FROM material_toc WHERE version_id=NEW.published_version_id;
  IF toc_items < 1 THEN
    RAISE EXCEPTION 'Published material needs a reviewed TOC' USING ERRCODE='23514';
  END IF;
  IF NEW.visibility_mode='RESTRICTED' THEN
    SELECT count(*) INTO allowed_colleges FROM material_college_visibility WHERE material_id=NEW.id;
    IF allowed_colleges=0 THEN
      RAISE EXCEPTION 'Restricted publication requires at least one college' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_publish_guard
BEFORE INSERT OR UPDATE OF publication_status,published_version_id,visibility_mode ON materials
FOR EACH ROW EXECUTE FUNCTION oys_guard_publish();

-- Historical reward audit records cannot be rewritten; corrective actions require
-- a future separate, auditable adjustment migration and approved business policy.
CREATE OR REPLACE FUNCTION oys_deny_immutable_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Historical reading/reward audit rows are immutable' USING ERRCODE='23514';
END;
$$;
CREATE TRIGGER trg_no_edit_credit_ledger
BEFORE UPDATE OR DELETE ON premium_credit_ledger
FOR EACH ROW EXECUTE FUNCTION oys_deny_immutable_mutation();
CREATE TRIGGER trg_no_edit_qualifying_completion
BEFORE UPDATE OR DELETE ON qualifying_free_completions
FOR EACH ROW EXECUTE FUNCTION oys_deny_immutable_mutation();
CREATE TRIGGER trg_no_edit_page_completion
BEFORE UPDATE OR DELETE ON student_page_completions
FOR EACH ROW EXECUTE FUNCTION oys_deny_immutable_mutation();
