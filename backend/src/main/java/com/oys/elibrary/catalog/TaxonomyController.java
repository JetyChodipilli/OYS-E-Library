package com.oys.elibrary.catalog;

import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** List only taxonomy that has at least one material visible to the authenticated college. */
@RestController
@RequestMapping("/api/v1/elibrary")
public class TaxonomyController {
  private final NamedParameterJdbcTemplate jdbc;
  public TaxonomyController(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

  public record CategoryView(UUID id, UUID sectorId, UUID parentId, String slug,
                             String name, String description, int displayOrder) {}
  public record SubjectView(UUID id, UUID sectorId, UUID categoryId, String slug,
                            String title, String description) {}

  private record Scope(boolean admin,String collegeId) {}
  private Scope scope(Jwt jwt,Authentication auth) {
    if(jwt==null||auth==null)throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"OYS login required");
    boolean admin=auth.getAuthorities().stream().anyMatch(a->"ROLE_OYS_SUPER_ADMIN".equals(a.getAuthority()));
    String collegeId=jwt.getClaimAsString("college_id");
    if(!admin&&(collegeId==null||collegeId.isBlank()))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Verified college membership is required");
    return new Scope(admin,collegeId);
  }

  @GetMapping("/categories")
  @PreAuthorize("hasAnyAuthority('ROLE_OYS_STUDENT','ROLE_OYS_SUPER_ADMIN')")
  public List<CategoryView> categories(@RequestParam UUID sectorId,
      @AuthenticationPrincipal Jwt jwt,Authentication auth) {
    Scope scope=scope(jwt,auth);
    return jdbc.query("""
        SELECT c.id,c.sector_id,c.parent_id,c.slug,c.name,c.description,c.display_order
        FROM categories c
        LEFT JOIN categories parent ON parent.id=c.parent_id
        JOIN sectors s ON s.id=c.sector_id
        WHERE c.sector_id=:sectorId AND c.is_active AND s.is_active
          AND (parent.id IS NULL OR parent.is_active)
          AND (:admin=true OR EXISTS (
            SELECT 1 FROM subjects sub JOIN materials m ON m.subject_id=sub.id
            JOIN categories leaf ON leaf.id=sub.category_id
            WHERE sub.is_active AND leaf.is_active
              AND (leaf.id=c.id OR leaf.parent_id=c.id)
              AND m.publication_status='PUBLISHED' AND m.published_version_id IS NOT NULL
              AND (m.visibility_mode='ALL_COLLEGES' OR EXISTS (
                SELECT 1 FROM material_college_visibility v
                WHERE v.material_id=m.id AND v.college_id=:collegeId))))
        ORDER BY COALESCE(parent.display_order,c.display_order),parent.name NULLS FIRST,
                 c.parent_id NULLS FIRST,c.display_order,c.name,c.id
        """,new MapSqlParameterSource().addValue("sectorId",sectorId)
          .addValue("admin",scope.admin()).addValue("collegeId",scope.collegeId()),
        (rs,i)->new CategoryView((UUID)rs.getObject("id"),(UUID)rs.getObject("sector_id"),
          (UUID)rs.getObject("parent_id"),rs.getString("slug"),rs.getString("name"),
          rs.getString("description"),rs.getInt("display_order")));
  }

  @GetMapping("/subjects")
  @PreAuthorize("hasAnyAuthority('ROLE_OYS_STUDENT','ROLE_OYS_SUPER_ADMIN')")
  public List<SubjectView> subjects(@RequestParam UUID categoryId,
      @AuthenticationPrincipal Jwt jwt,Authentication auth) {
    Scope scope=scope(jwt,auth);
    return jdbc.query("""
        SELECT sub.id,sub.sector_id,sub.category_id,sub.slug,sub.title,sub.description
        FROM subjects sub JOIN categories c ON c.id=sub.category_id
        JOIN sectors s ON s.id=sub.sector_id
        LEFT JOIN categories parent ON parent.id=c.parent_id
        WHERE (c.id=:categoryId OR c.parent_id=:categoryId) AND sub.is_active AND c.is_active AND s.is_active
          AND (parent.id IS NULL OR parent.is_active)
          AND (:admin=true OR EXISTS (
            SELECT 1 FROM materials m
            WHERE m.subject_id=sub.id AND m.publication_status='PUBLISHED'
              AND m.published_version_id IS NOT NULL
              AND (m.visibility_mode='ALL_COLLEGES' OR EXISTS (
                 SELECT 1 FROM material_college_visibility v
                 WHERE v.material_id=m.id AND v.college_id=:collegeId))))
        ORDER BY sub.display_order,sub.title,sub.id
        """,new MapSqlParameterSource().addValue("categoryId",categoryId)
          .addValue("admin",scope.admin()).addValue("collegeId",scope.collegeId()),
        (rs,i)->new SubjectView((UUID)rs.getObject("id"),(UUID)rs.getObject("sector_id"),
          (UUID)rs.getObject("category_id"),rs.getString("slug"),
          rs.getString("title"),rs.getString("description")));
  }
}
