package com.oys.elibrary.admin;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/elibrary/admin/sectors")
public class AdminSectorController {
  private final NamedParameterJdbcTemplate jdbc;
  public AdminSectorController(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

  public record CreateSectorRequest(
      @NotBlank @Pattern(regexp="[a-z0-9]+(-[a-z0-9]+)*") @Size(max=96) String slug,
      @NotBlank @Size(max=140) String name,
      @Size(max=3000) String description) {}
  public record CreatedSector(UUID id, String slug, String name) {}

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAuthority('ROLE_OYS_SUPER_ADMIN')")
  public CreatedSector create(@Valid @RequestBody CreateSectorRequest body,
                              @AuthenticationPrincipal Jwt jwt) {
    UUID id = UUID.randomUUID();
    jdbc.update("INSERT INTO sectors(id,slug,name,description,created_by) " +
        "VALUES (:id,:slug,:name,:description,:actor)",
      new org.springframework.jdbc.core.namedparam.MapSqlParameterSource()
        .addValue("id", id).addValue("slug", body.slug()).addValue("name", body.name().trim())
        .addValue("description", body.description()).addValue("actor", jwt.getSubject()));
    return new CreatedSector(id,body.slug(),body.name().trim());
  }
}
