# OYS E-Library — local database and real JWT issuer

**Local development only.** This setup creates a real local identity provider but does not yet implement Next.js login/session integration, verified college onboarding, subscription checks, single-session policy, or production deployment. Do not deploy this as a complete production solution.

## 1. Create local, Git-ignored configuration

On Windows CMD run `setup-env.cmd` from the repository root; on macOS/Linux use `bash setup-env.sh`. The scripts preserve any pre-existing files and create missing:

- `backend/.env`
- `frontend/.env`
- `infrastructure/keycloak/.env`

The root `.gitignore` excludes all `.env` secrets while allowing `.env.example` templates. Spring Boot reads `backend/.env` as Java properties. Run the backend with working directory either at the repo root or `backend/`. Process environment variables override imported local files.

## 2. Set up PostgreSQL 16+

Configure `backend/.env`:

```properties
OYS_DB_URL=jdbc:postgresql://127.0.0.1:5432/oys_elibrary
OYS_DB_USER=oys_elibrary_app
OYS_DB_PASSWORD=YOUR_ACTUAL_UNIQUE_DATABASE_PASSWORD
```

Replace the password with a long unique value **only in the local file**.

If you already run PostgreSQL locally, connect as its administrator and, **only if missing**, create the application login and database:

```sql
CREATE ROLE oys_elibrary_app LOGIN;
CREATE DATABASE oys_elibrary OWNER oys_elibrary_app;
```

Set the password through the interactive `psql` command `\password oys_elibrary_app`, which avoids putting credentials in shell or SQL history. Do not reuse a `postgres/postgres` administrative login. Flyway needs migration privileges; production should use a separate migration account and minimally privileged app account.

Alternatively, for a **fresh Docker development database**, start the existing repo service:

```powershell
docker compose --env-file backend/.env -f infrastructure/compose.dev.yaml up -d postgres
```

Choose either the installed PostgreSQL service or the Docker service; both cannot bind `127.0.0.1:5432`. For a new Docker volume, Postgres uses `OYS_DB_USER` and `OYS_DB_PASSWORD` during initialization. The current Docker dev Compose creates an initial superuser; this must not be used as a production least-privilege scheme. Changing env values does **not** change credentials in an existing PostgreSQL volume: do not erase data to force a reset.

## 3. Start local Keycloak authentication

Install Docker Desktop. Set `infrastructure/keycloak/.env` (ignored by Git):

```properties
KC_BOOTSTRAP_ADMIN_USERNAME=oys-local-admin
KC_BOOTSTRAP_ADMIN_PASSWORD=SET_A_UNIQUE_LONG_RANDOM_PASSWORD
```

Use your own strong password. From repository root run:

```powershell
docker compose --env-file infrastructure/keycloak/.env -f infrastructure/compose.auth.dev.yaml up -d
```

The local Keycloak container listens only on `127.0.0.1:8180` and imports `infrastructure/keycloak/oys-realm.json` if the `oys` realm does not already exist. Its data persists in a Docker volume. If this is an existing realm, import does not overwrite it; update the realm through the admin console. Bootstrap admin credentials only apply at initial setup; editing the env file later does not rotate the existing password.

Verify:

- Admin: http://localhost:8180/admin/
- Discovery: http://localhost:8180/realms/oys/.well-known/openid-configuration
- JWKS: http://localhost:8180/realms/oys/protocol/openid-connect/certs

Discovery must report issuer `http://localhost:8180/realms/oys`. JWKS must contain a `keys` array.

## 4. Configure actual local JWT endpoints

Keep these entries in your local `backend/.env`:

```properties
OYS_JWT_ISSUER=http://localhost:8180/realms/oys
OYS_JWKS_URI=http://localhost:8180/realms/oys/protocol/openid-connect/certs
OYS_JWT_AUDIENCE=oys-elibrary
PORT=8080
```

Do not add `[Markdown link](...)` syntax inside environment files. The backend already has a real `JwtDecoder` checking the signature with the JWKS, `iss`, `aud`, and token timestamps. Do not bypass any validator.

The imported OYS realm contains:
- Audience/resource client `oys-elibrary`.
- Browser client `oys-elibrary-web` using **Authorization Code + PKCE S256**, exact local callback `http://localhost:3000/auth/callback` (callback is **not yet implemented**).
- Protocol mappers supplying access token `aud` including `oys-elibrary`, top-level `roles`, and `college_id` from an admin-managed Keycloak user attribute.
- Realm roles `OYS_STUDENT`, `OYS_SUPER_ADMIN`. No seeded student/admin accounts or auto-granted roles. Self registration disabled.

For a non-production test student, create the user in Keycloak Admin Console and explicitly assign the `OYS_STUDENT` realm role. Set a verified `college_id` user attribute pointing to your trusted college record. Do not grant users self-service editing of `college_id`. Verify subscription and college membership server-side before real release. Grant `OYS_SUPER_ADMIN` only to explicitly approved administrators.

**Important**: This configures a real issuer and Keycloak token contract; it does **not** supply a working Next.js callback or obtain a login token. Avoid password grant/direct access grant shortcuts. Complete a frontend OIDC browser login with secure, HTTP-only session cookies and CSRF protection on cookie-authenticated mutation routes.

## 5. Start backend and check fail-closed security

From `backend/` run `mvn spring-boot:run`; from repo root run `mvn -pl backend spring-boot:run`. Java 21 and Maven are required. The Spring Boot backend is on `http://localhost:8080`.

- `http://localhost:8080/actuator/health` should respond when DB and migrations are healthy.
- `GET /api/v1/elibrary/sectors` **without** a Bearer token must be rejected.
- When the real frontend OIDC login exists, pass a genuine Keycloak **access** token with correct `iss`, `aud`, `roles`, and a valid verified `college_id` for applicable student endpoints.
- Wrong issuer, wrong audience, invalid signature, expired token or absent required role must be rejected.

`frontend/.env` contains only `OYS_PREVIEW_MODE=true` for local fixture previews, **not a functional login**. Never expose DB credentials or bearer tokens in `NEXT_PUBLIC_` values.

## 6. Production requirements

Do not run the `start-dev` Keycloak container, embedded dev storage, or the localhost HTTP issuer in production. Production requires an HTTPS domain under your control, Keycloak persistent PostgreSQL storage, TLS and reverse-proxy security, secret manager, backups, Keycloak account lifecycle and token policies, separate DB migration/runtime roles, and authorized college/subscription integration. The application README documents additional unfinished production functionality.
