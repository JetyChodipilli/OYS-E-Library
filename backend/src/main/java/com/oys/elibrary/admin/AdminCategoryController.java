package com.oys.elibrary.admin;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/elibrary/admin/categories")
@PreAuthorize("hasAuthority('ROLE_OYS_SUPER_ADMIN')")
public class AdminCategoryController {
  private final NamedParameterJdbcTemplate jdbc;
  public AdminCategoryController(NamedParameterJdbcTemplate jdbc){this.jdbc=jdbc;}

  public record CategoryRequest(
      @NotNull UUID sectorId, UUID parentId,
      @NotBlank @Pattern(regexp="[a-z0-9]+(-[a-z0-9]+)*") @Size(max=96) String slug,
      @NotBlank @Size(max=180) String name,
      @Size(max=3000) String description,
      Integer displayOrder, Boolean active) {}
  public record CategoryResult(UUID id,UUID sectorId,UUID parentId,String slug,String name) {}

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public CategoryResult create(@Valid @RequestBody CategoryRequest body,@AuthenticationPrincipal Jwt jwt){
    UUID id=UUID.randomUUID();
    var params=parameters(body).addValue("id",id).addValue("actor",jwt.getSubject());
    jdbc.update("""
       INSERT INTO categories(id,sector_id,parent_id,slug,name,description,display_order,is_active,created_by)
       VALUES(:id,:sectorId,:parentId,:slug,:name,:description,:displayOrder,:active,:actor)
       """,params);
    return new CategoryResult(id,body.sectorId(),body.parentId(),body.slug(),body.name().strip());
  }

  @PutMapping("/{id}")
  public CategoryResult update(@PathVariable UUID id,@Valid @RequestBody CategoryRequest body){
    int changed=jdbc.update("""
      UPDATE categories SET sector_id=:sectorId,parent_id=:parentId,slug=:slug,
      name=:name,description=:description,display_order=:displayOrder,is_active=:active,
      updated_at=now() WHERE id=:id
      """,parameters(body).addValue("id",id));
    if(changed==0)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Category not found");
    return new CategoryResult(id,body.sectorId(),body.parentId(),body.slug(),body.name().strip());
  }

  private MapSqlParameterSource parameters(CategoryRequest body){
    return new MapSqlParameterSource().addValue("sectorId",body.sectorId())
      .addValue("parentId",body.parentId()).addValue("slug",body.slug())
      .addValue("name",body.name().strip()).addValue("description",body.description())
      .addValue("displayOrder",body.displayOrder()==null?0:body.displayOrder())
      .addValue("active",body.active()==null?true:body.active());
  }
}
