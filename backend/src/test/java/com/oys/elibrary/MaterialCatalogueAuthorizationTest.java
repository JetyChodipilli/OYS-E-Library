package com.oys.elibrary;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;
import com.oys.elibrary.catalog.MaterialCatalogueController;

class MaterialCatalogueAuthorizationTest {
  private final MaterialCatalogueController controller =
      new MaterialCatalogueController(mock(NamedParameterJdbcTemplate.class));

  private Jwt token(boolean withCollege) {
    var builder=Jwt.withTokenValue("unit-test").header("alg","none")
      .subject("student-test").claim("roles",List.of("OYS_STUDENT"));
    if(withCollege) builder.claim("college_id","college-test");
    return builder.build();
  }

  @Test void missingCollegeClaimIsRejectedBeforeDatabaseLookup() {
    var auth=new TestingAuthenticationToken("student-test","test","ROLE_OYS_STUDENT");
    var error=assertThrows(ResponseStatusException.class,()->
      controller.materials(null,null,null,null,"","RECENT",0,12,token(false),auth));
    assertEquals(HttpStatus.FORBIDDEN,error.getStatusCode());
  }

  @Test void unsafeSortOptionIsRejectedBeforeDatabaseLookup() {
    var auth=new TestingAuthenticationToken("student-test","test","ROLE_OYS_STUDENT");
    var error=assertThrows(ResponseStatusException.class,()->
      controller.materials(null,null,null,null,"","TITLE_ASC;DROP_TABLE",0,12,token(true),auth));
    assertEquals(HttpStatus.BAD_REQUEST,error.getStatusCode());
  }
}
