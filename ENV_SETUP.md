# OYS E-Library — local `.env` setup

The project contains two separate applications: **Spring Boot backend** and **Next.js frontend**. This public repository commits only safe `.env.example` templates, never real credentials.

## Windows: create both local files

In CMD, from the cloned repository **root** (not inside `frontend`):

```cmd
git pull origin main
setup-env.cmd
```

The script creates `backend/.env` and `frontend/.env` **only if absent** and does not overwrite existing files. If you use PowerShell, run `./setup-env.cmd` (or `.\setup-env.cmd`). On macOS/Linux, run `bash setup-env.sh`.

## Backend: edit `backend/.env`

```dotenv
OYS_DB_URL=jdbc:postgresql://127.0.0.1:5432/oys_elibrary
OYS_DB_USER=oys_elibrary_app
OYS_DB_PASSWORD=YOUR_REAL_POSTGRES_PASSWORD
OYS_JWT_ISSUER=https://YOUR_REAL_OYS_ISSUER/
OYS_JWKS_URI=https://YOUR_REAL_OYS_IDENTITY_PROVIDER/.well-known/jwks.json
OYS_JWT_AUDIENCE=oys-elibrary
PORT=8080
```

Replace placeholders with values from your real local PostgreSQL and **existing OYS login service**. This repository does not provide identity credentials. The JWT issuer must exactly match the `iss` claim, JWKS must be the public signing-key endpoint, and the configured audience must agree with the JWT `aud` claim. There is deliberately no fake-JWT bypass.

Spring Boot **does not automatically load arbitrary `.env` files**. `backend/src/main/resources/application.yml` now uses:

```yaml
spring:
  config:
    import:
      - "optional:file:./.env[.properties]"
      - "optional:file:./backend/.env[.properties]"
```

This supports running Spring Boot from `backend/` **or** the repository root. Real deployment environment variables take precedence. If values are absent, required database/JWT placeholders cause startup to fail safely. The optional import allows deployment without disk-based `.env` files, not authentication bypass.

### Eclipse / STS

1. Import the repository root using **File → Import → Maven → Existing Maven Projects**.
2. Use **Java 21** and select the **backend** Spring Boot module to run.
3. In **Run Configurations → Arguments → Working directory**, choose either the repository root or `backend/`; it must be one of these two paths for relative `.env` imports to resolve.
4. Check PostgreSQL is running and the database/user exist. The app needs real OYS JWT issuer/JWKS settings to start.

You may also run from the repository root:

```cmd
mvn -pl backend spring-boot:run
```

Or from `backend/`:

```cmd
mvn spring-boot:run
```

## Frontend: `frontend/.env`

```dotenv
OYS_PREVIEW_MODE=true
```

This enables **sample-data UI previews only**, and only for `NODE_ENV=development` (set by `npm run dev`). The frontend is not yet connected to the OYS API or student login. Never add DB credentials, private keys or tokens to a frontend environment file; values prefixed `NEXT_PUBLIC_` are exposed to browsers.

```cmd
cd frontend
npm install
npm run dev
```

Next.js automatically reads `.env`. If you already have `frontend/.env.local`, that file takes precedence over `frontend/.env`; avoid conflicting values.

## Git security

The root `.gitignore` excludes `.env` and `.env.*` except `.env.example`. Before committing, run `git status --short` and ensure no secrets are staged. For production, use a secret manager/environment variables rather than local `.env` files. Do not commit database passwords, JWTs, or private signing keys.

## Scope

This change configures environment loading; it does **not** implement the outstanding PDF upload/reading, persistent reading progress, Premium credit transactions, or authentication integration.
