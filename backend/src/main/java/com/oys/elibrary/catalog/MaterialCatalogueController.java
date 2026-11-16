package com.oys.elibrary.catalog;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Read-only, college-scoped, server-paginated published catalogue. */
@RestController
@RequestMapping("/api/v1/elibrary")
@Validated
public class MaterialCatalogueController {
  private final NamedParameterJdbcTemplate jdbc;
  public MaterialCatalogueController(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

  public record MaterialSummary(UUID id, String title, String summary, String accessTier,
      UUID sectorId, String sector, UUID categoryId, String category,
      UUID subjectId, String subject, OffsetDateTime publishedAt) {}
  public record PageResponse<T>(List<T> content, int page, int size, long totalElements,
      long totalPages, boolean hasNext, boolean hasPrevious) {}

  @Transactional(readOnly=true, isolation=Isolation.REPEATABLE_READ)
  @GetMapping("/materials")
  @PreAuthorize("hasAnyAuthority('ROLE_OYS_STUDENT','ROLE_OYS_SUPER_ADMIN')")
  public PageResponse<MaterialSummary> materials(
      @RequestParam(required=false) UUID sectorId,
      @RequestParam(required=false) UUID categoryId,
      @RequestParam(required=false) UUID subjectId,
      @RequestParam(required=false) String accessType,
      @RequestParam(required=false,defaultValue="") String search,
      @RequestParam(defaultValue="RECENT") String sort,
      @RequestParam(defaultValue="0") @Min(0) @Max(10000) int page,
      @RequestParam(defaultValue="12") @Min(1) @Max(48) int size,
      @AuthenticationPrincipal Jwt jwt,
      Authentication authentication) {
    if (jwt == null || authentication == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "OYS login required");
    }
    boolean superAdmin = authentication.getAuthorities().stream()
        .anyMatch(a -> "ROLE_OYS_SUPER_ADMIN".equals(a.getAuthority()));
    String collegeId = jwt.getClaimAsString("college_id");
    if (!superAdmin && (collegeId == null || collegeId.isBlank())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN,
          "Verified college membership is required");
    }
    String safeOrder = switch (sort.toUpperCase(java.util.Locale.ROOT)) {
      case "RECENT" -> "m.published_at DESC NULLS LAST,m.id ASC";
      case "UPDATED" -> "m.updated_at DESC,m.id ASC";
      case "TITLE_ASC" -> "lower(m.title) ASC,m.id ASC";
      case "TITLE_DESC" -> "lower(m.title) DESC,m.id ASC";
      default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported sort option");
    };
    if (accessType != null && !"FREE".equals(accessType) && !"PREMIUM".equals(accessType)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Access type must be FREE or PREMIUM");
    }
    String query = search.strip();
    if (query.length() > 100) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Search is too long");
    }
    // ! is SQL LIKE's escape character: wildcard input is treated literally.
    String like = "%" + query.replace("!", "!!").replace("%", "!%")
        .replace("_", "!_") + "%";
    MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("sectorId",sectorId).addValue("categoryId",categoryId)
        .addValue("subjectId",subjectId).addValue("accessType",accessType)
        .addValue("search",like).addValue("collegeId",collegeId)
        .addValue("limit",size).addValue("offset",(long)page*size);
    StringBuilder where = new StringBuilder("""
        FROM materials m
        JOIN material_versions mv ON mv.id=m.published_version_id AND mv.material_id=m.id
        JOIN asset_objects ra ON ra.id=mv.reader_asset_id AND ra.scan_status='CLEAN'
        JOIN asset_objects oa ON oa.id=mv.original_asset_id AND oa.scan_status='CLEAN'
        JOIN subjects sub ON sub.id=m.subject_id
        JOIN categories cat ON cat.id=sub.category_id
        JOIN sectors sec ON sec.id=sub.sector_id
        LEFT JOIN categories parent ON parent.id=cat.parent_id
        WHERE m.publication_status='PUBLISHED' AND m.published_version_id IS NOT NULL
          AND sub.is_active AND cat.is_active AND sec.is_active
          AND (parent.id IS NULL OR parent.is_active)
        """);
    if (!superAdmin) {
      where.append("""
         AND (m.visibility_mode='ALL_COLLEGES' OR EXISTS (
           SELECT 1 FROM material_college_visibility vis
           WHERE vis.material_id=m.id AND vis.college_id=:collegeId))
        """);
    }
    if (sectorId!=null) where.append(" AND sub.sector_id=:sectorId");
    // Match the selected category or its immediate subcategories.
    if (categoryId!=null) where.append(" AND (cat.id=:categoryId OR cat.parent_id=:categoryId)");
    if (subjectId!=null) where.append(" AND sub.id=:subjectId");
    if (accessType!=null) where.append(" AND m.access_tier=:accessType");
    if (!query.isEmpty()) where.append("""
        AND (m.title ILIKE :search ESCAPE '!'
          OR COALESCE(m.summary,'') ILIKE :search ESCAPE '!'
          OR sub.title ILIKE :search ESCAPE '!')
        """);
    String source = where.toString();
    Long total = jdbc.queryForObject("SELECT count(*) " + source, params, Long.class);
    long totalCount = total == null ? 0L : total;
    long totalPages = (totalCount + size - 1L) / size;
    List<MaterialSummary> rows = jdbc.query("""
        SELECT m.id,m.title,m.summary,m.access_tier,m.published_at,
          sec.id AS sector_id,sec.name AS sector_name,
          cat.id AS category_id,cat.name AS category_name,
          sub.id AS subject_id,sub.title AS subject_name
        """ + source + " ORDER BY " + safeOrder + " LIMIT :limit OFFSET :offset", params,
        (rs,i) -> new MaterialSummary((UUID)rs.getObject("id"),rs.getString("title"),
          rs.getString("summary"),rs.getString("access_tier"),
          (UUID)rs.getObject("sector_id"),rs.getString("sector_name"),
          (UUID)rs.getObject("category_id"),rs.getString("category_name"),
          (UUID)rs.getObject("subject_id"),rs.getString("subject_name"),
          rs.getObject("published_at",OffsetDateTime.class)));
    return new PageResponse<>(rows,page,size,totalCount,totalPages,page+1L<totalPages,page>0);
  }
}
