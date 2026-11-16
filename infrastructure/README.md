# Infrastructure scaffold

`compose.dev.yaml` starts only **local PostgreSQL and Redis** for development. It intentionally does not start a fake identity provider or make private API routes public. Set DB username and password in a local **uncommitted** environment first:

```bash
export OYS_DB_USER=oys_elibrary_app
export OYS_DB_PASSWORD='your-own-strong-secret'
docker compose -f infrastructure/compose.dev.yaml up -d
```

Production design: TLS edge/load balancer → Spring Cloud Gateway (validated bearer JWT, Redis rate limiting, request size limits) → stateless Spring Boot API; isolated document worker; private bucket, managed PostgreSQL and managed Redis. Gateway production config and deployed Terraform/Kubernetes require actual cloud provider, OYS network topology and secret manager. Do not blindly expose Redis/Postgres public ports.

**Caution:** The initial migration has `CREATE EXTENSION IF NOT EXISTS pgcrypto`, requiring an appropriate migration DB role. The final runtime role should have least privilege and no schema-modification permissions.
