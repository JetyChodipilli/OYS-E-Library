package com.oys.elibrary.security;

import java.util.Collection;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfiguration {
  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    // These APIs accept only Authorization: Bearer, NOT cookies as auth.
    // If OYS integrates a cookie-based BFF, enable CSRF on the BFF mutating routes.
    http.csrf(AbstractHttpConfigurer::disable)
      .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
      .authorizeHttpRequests(auth -> auth
        .requestMatchers(HttpMethod.GET, "/actuator/health").permitAll()
        // Explicit route-level Super Admin boundary complements @PreAuthorize.
        .requestMatchers("/api/v1/elibrary/admin/**").hasAuthority("ROLE_OYS_SUPER_ADMIN")
        .requestMatchers(HttpMethod.GET, "/api/v1/elibrary/**")
          .hasAnyAuthority("ROLE_OYS_STUDENT", "ROLE_OYS_SUPER_ADMIN")
        // New endpoints must opt in to an explicit policy, never default permit.
        .anyRequest().denyAll())
      .oauth2ResourceServer(oauth -> oauth.jwt(jwt -> jwt.jwtAuthenticationConverter(oysJwtConverter())));
    return http.build();
  }

  @Bean
  JwtDecoder jwtDecoder(
      @Value("${OYS_JWKS_URI}") String jwksUri,
      @Value("${OYS_JWT_ISSUER}") String issuer,
      @Value("${oys.security.audience}") String audience) {
    NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwksUri).build();
    OAuth2TokenValidator<Jwt> issuerValidator = JwtValidators.createDefaultWithIssuer(issuer);
    OAuth2TokenValidator<Jwt> audValidator = new JwtClaimValidator<Collection<String>>(
      "aud", aud -> aud != null && aud.contains(audience));
    decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(issuerValidator, audValidator));
    return decoder;
  }

  @Bean
  JwtAuthenticationConverter oysJwtConverter() {
    JwtGrantedAuthoritiesConverter scopes = new JwtGrantedAuthoritiesConverter();
    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(jwt -> {
      var authorities = new java.util.ArrayList<>(scopes.convert(jwt));
      List<String> roles = jwt.getClaimAsStringList("roles");
      if (roles != null) {
        for (String role : roles) {
          // Never grant unknown or forged authority names from arbitrary claims.
          if ("OYS_SUPER_ADMIN".equals(role) || "OYS_STUDENT".equals(role)) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
          }
        }
      }
      return authorities;
    });
    return converter;
  }
}
