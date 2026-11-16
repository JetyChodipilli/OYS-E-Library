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
@RequestMapping("/api/v1/elibrary/admin/subjects")
@PreAuthorize("hasAuthority('ROLE_OYS_SUPER_ADMIN')")
public class AdminSubjectController {
  private final NamedParameterJdbcTemplate jdbc;
  public AdminSubjectController(NamedParameterJdbcTemplate jdbc){this.jdbc=jdbc;}

  public record CreateSubjectRequest(
      @NotNull UUID sectorId,@NotNull UUID categoryId,
      @NotBlank @Pattern(regexp="[a-z0-9]+(-[a-z0-9]+)*") @Size(max=96) String slug,
      @NotBlank @Size(max=180) String title,@Size(max=3000) String description) {}
  public record MoveSubjectRequest(@NotNull UUID categoryId) {}
  public record SubjectResult(UUID id,UUID categoryId,String title) {}

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public SubjectResult create(@Valid @RequestBody CreateSubjectRequest body,@AuthenticationPrincipal Jwt jwt){
    UUID id=UUID.randomUUID();
    jdbc.update("""
      INSERT INTO subjects(id,sector_id,category_id,slug,title,description,created_by)
      VALUES(:id,:sectorId,:categoryId,:slug,:title,:description,:actor)
      """,new MapSqlParameterSource().addValue("id",id).addValue("sectorId",body.sectorId())
      .addValue("categoryId",body.categoryId()).addValue("slug",body.slug())
      .addValue("title",body.title().strip()).addValue("description",body.description())
      .addValue("actor",jwt.getSubject()));
    return new SubjectResult(id,body.categoryId(),body.title().strip());
  }

  @PutMapping("/{id}/category")
  public SubjectResult move(@PathVariable UUID id,@Valid @RequestBody MoveSubjectRequest body){
    // Same-sector FK prevents moving to a category belonging to a different sector.
    int changed=jdbc.update("UPDATE subjects SET category_id=:categoryId,updated_at=now() WHERE id=:id",
      new MapSqlParameterSource().addValue("categoryId",body.categoryId()).addValue("id",id));
    if(changed==0)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Subject not found");
    return new SubjectResult(id,body.categoryId(),"Category updated");
  }
}
