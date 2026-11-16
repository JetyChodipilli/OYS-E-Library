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
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/elibrary")
public class CatalogueController {
  private final NamedParameterJdbcTemplate jdbc;
  public CatalogueController(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

  public record SectorView(UUID id, String slug, String name, String description) {}

  @GetMapping("/sectors")
  @PreAuthorize("hasAnyAuthority('ROLE_OYS_STUDENT','ROLE_OYS_SUPER_ADMIN')")
  public List<SectorView> sectors(@AuthenticationPrincipal Jwt jwt, Authentication authentication) {
    if (jwt == null || authentication == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"OYS login required");
    }
    boolean superAdmin = authentication.getAuthorities().stream()
      .anyMatch(a -> "ROLE_OYS_SUPER_ADMIN".equals(a.getAuthority()));
    String collegeId = jwt.getClaimAsString("college_id");
    if (!superAdmin && (collegeId == null || collegeId.isBlank())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Verified college membership is required");
    }
    return jdbc.query("""
      SELECT s.id,s.slug,s.name,s.description FROM sectors s WHERE s.is_active
        AND (:admin=true OR EXISTS (
          SELECT 1 FROM subjects sub
          JOIN categories c ON c.id=sub.category_id
          LEFT JOIN categories p ON p.id=c.parent_id
          JOIN materials m ON m.subject_id=sub.id
          WHERE sub.sector_id=s.id AND sub.is_active AND c.is_active
            AND (p.id IS NULL OR p.is_active)
            AND m.publication_status='PUBLISHED' AND m.published_version_id IS NOT NULL
            AND (m.visibility_mode='ALL_COLLEGES' OR EXISTS (
              SELECT 1 FROM material_college_visibility v
              WHERE v.material_id=m.id AND v.college_id=:collegeId))))
      ORDER BY s.display_order,s.name,s.id
      """, new MapSqlParameterSource().addValue("admin",superAdmin).addValue("collegeId",collegeId),
      (rs,i)->new SectorView((UUID)rs.getObject("id"),rs.getString("slug"),
        rs.getString("name"),rs.getString("description")));
  }
}
