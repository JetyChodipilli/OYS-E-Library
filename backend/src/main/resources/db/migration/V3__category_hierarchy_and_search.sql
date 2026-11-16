-- OYS E-Library v1.5: Sector -> Category -> optional Subcategory -> Subject -> Material.
-- Safe additive migration for existing subjects; no materials/progress/credits are deleted.
-- PostgreSQL 16+. Categories have at most two levels by business decision.

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id uuid NOT NULL REFERENCES sectors(id) ON DELETE RESTRICT,
  parent_id uuid,
  slug varchar(96) NOT NULL,
  name varchar(180) NOT NULL,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by varchar(128) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_sector_id_id_uq UNIQUE (sector_id,id),
  -- Treat NULL parents as equal so two root categories cannot share a slug.
  CONSTRAINT categories_sibling_slug_uq UNIQUE NULLS NOT DISTINCT (sector_id,parent_id,slug),
  CONSTRAINT categories_slug_chk CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT categories_name_chk CHECK (btrim(name) <> ''),
  CONSTRAINT categories_actor_chk CHECK (btrim(created_by) <> ''),
  CONSTRAINT categories_self_parent_chk CHECK (parent_id IS DISTINCT FROM id),
  CONSTRAINT categories_same_sector_fk FOREIGN KEY (sector_id,parent_id)
    REFERENCES categories(sector_id,id) ON DELETE RESTRICT
);

CREATE OR REPLACE FUNCTION oys_validate_category_parent()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_parent_id uuid; parent_active boolean;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    -- Lock parent to serialize concurrent re-parenting and child creation.
    SELECT c.parent_id,c.is_active INTO parent_parent_id,parent_active
      FROM categories c WHERE c.id = NEW.parent_id AND c.sector_id = NEW.sector_id
      FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Category parent must belong to the same sector' USING ERRCODE='23514';
    END IF;
    IF NEW.is_active AND NOT parent_active THEN
      RAISE EXCEPTION 'Active subcategory requires an active parent' USING ERRCODE='23514';
    END IF;
    IF parent_parent_id IS NOT NULL THEN
      RAISE EXCEPTION 'Only category and one subcategory level are supported' USING ERRCODE='23514';
    END IF;
    IF EXISTS (SELECT 1 FROM categories c WHERE c.parent_id=NEW.id) THEN
      RAISE EXCEPTION 'A category with children cannot become a subcategory' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_categories_depth
  BEFORE INSERT OR UPDATE OF sector_id,parent_id ON categories
  FOR EACH ROW EXECUTE FUNCTION oys_validate_category_parent();

-- Existing subjects are placed under a real 'General' category, preserving their ids.
INSERT INTO categories (sector_id, slug, name, description, created_by)
SELECT id, 'general', 'General', 'Migrated subjects; Super Admin can recategorize them.', 'OYS_SCHEMA_MIGRATION'
FROM sectors;

ALTER TABLE subjects ADD COLUMN category_id uuid;
UPDATE subjects s
   SET category_id=c.id
  FROM categories c
 WHERE c.sector_id=s.sector_id AND c.slug='general' AND c.parent_id IS NULL;
ALTER TABLE subjects ALTER COLUMN category_id SET NOT NULL;
ALTER TABLE subjects ADD CONSTRAINT subjects_category_same_sector_fk
  FOREIGN KEY (sector_id,category_id) REFERENCES categories(sector_id,id) ON DELETE RESTRICT;

-- Prevent publishing orphaned or cross-sector subject category assignments.
CREATE INDEX idx_categories_sector_parent_order
  ON categories(sector_id,parent_id,display_order,name,id) WHERE is_active;
CREATE INDEX idx_subjects_category_order
  ON subjects(category_id,display_order,title,id) WHERE is_active;
CREATE INDEX idx_materials_status_updated
  ON materials(publication_status,updated_at DESC,id) WHERE publication_status='PUBLISHED';

-- Search indexes for contains-search over material and subject titles.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_materials_title_trgm ON materials USING gin (title gin_trgm_ops);
CREATE INDEX idx_materials_summary_trgm ON materials USING gin (summary gin_trgm_ops);
CREATE INDEX idx_subjects_title_trgm ON subjects USING gin (title gin_trgm_ops);

COMMENT ON TABLE categories IS 'Sector taxonomy: root category (parent_id NULL) or one-level subcategory only. Access tier and Trending are independent of taxonomy.';
COMMENT ON COLUMN subjects.category_id IS 'Mandatory category membership after migration. Same-sector composite FK prevents cross-sector assignments.';

-- Do not silently hide a populated branch by deactivating its category.
CREATE OR REPLACE FUNCTION oys_guard_category_activity()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_active = false AND OLD.is_active = true THEN
    IF EXISTS (SELECT 1 FROM categories c WHERE c.parent_id=NEW.id AND c.is_active)
       OR EXISTS (SELECT 1 FROM subjects s WHERE s.category_id=NEW.id AND s.is_active) THEN
      RAISE EXCEPTION 'Move or deactivate active subcategories and subjects before hiding a category'
        USING ERRCODE='23514';
    END IF;
  END IF;
  IF NEW.is_active = true AND NEW.parent_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM categories p WHERE p.id=NEW.parent_id AND p.is_active) THEN
      RAISE EXCEPTION 'An active subcategory requires an active parent' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_categories_activity
BEFORE UPDATE OF is_active,parent_id ON categories
FOR EACH ROW EXECUTE FUNCTION oys_guard_category_activity();

CREATE OR REPLACE FUNCTION oys_guard_subject_category()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM categories c
    LEFT JOIN categories parent ON parent.id=c.parent_id
    WHERE c.id=NEW.category_id AND c.sector_id=NEW.sector_id AND c.is_active
      AND (parent.id IS NULL OR parent.is_active)
  ) THEN
    RAISE EXCEPTION 'Subject category must be active and belong to the same sector'
      USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_subject_category_active
BEFORE INSERT OR UPDATE OF category_id,sector_id ON subjects
FOR EACH ROW EXECUTE FUNCTION oys_guard_subject_category();
