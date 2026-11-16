package com.oys.elibrary;

import static org.junit.jupiter.api.Assertions.assertTrue;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class SchemaContractTest {
  @Test void migrationContainsCreditAndProgressConstraints() throws Exception {
    try (InputStream stream = getClass().getResourceAsStream("/db/migration/V1__core_schema.sql")) {
      assertTrue(stream != null);
      String sql = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
      assertTrue(sql.contains("PRIMARY KEY (student_id,page_id)"));
      assertTrue(sql.contains("PRIMARY KEY (student_id,material_id)"));
      assertTrue(sql.contains("earned_credits = qualifying_count / 3"));
      assertTrue(sql.contains("student_material_access"));
    }
  }
  @Test void taxonomyMigrationAddsNonDestructiveCategoryHierarchy() throws Exception {
    try (InputStream stream = getClass().getResourceAsStream("/db/migration/V3__category_hierarchy_and_search.sql")) {
      assertTrue(stream != null);
      String sql = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
      assertTrue(sql.contains("CREATE TABLE categories ("));
      assertTrue(sql.contains("UNIQUE NULLS NOT DISTINCT (sector_id,parent_id,slug)"));
      assertTrue(sql.contains("subjects_category_same_sector_fk"));
      assertTrue(sql.contains("ALTER COLUMN category_id SET NOT NULL"));
      assertTrue(sql.contains("trg_categories_depth"));
      assertTrue(sql.contains("trg_categories_activity"));
    }
  }
}
