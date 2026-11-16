# Import OYS E-Library in Eclipse / Spring Tool Suite

This repository contains a Java Maven backend and a **separate Next.js frontend**.

```text
OYS-E-Library/
├── pom.xml           # Root Maven aggregator (packaging=pom)
├── backend/
│   ├── pom.xml       # Spring Boot backend Maven module (Java 21)
│   └── src/
├── frontend/         # Next.js / TypeScript (npm, NOT Maven)
├── architecture/
└── tests/
```

The root POM is a Maven aggregator, not another runnable Spring Boot application.

## Import into Eclipse / STS

1. Pull the latest `main` branch or clone the repository again.
2. Choose **File → Import → Maven → Existing Maven Projects**.
3. Select the checkout's **`OYS-E-Library` root directory**, not `src` or `frontend`.
4. Select **both** POMs: `pom.xml` and `backend/pom.xml`, then choose **Finish**.
5. Work in the **backend / oys-elibrary-api** Java project.
6. Ensure Eclipse uses **JDK 21** under Window → Preferences → Java → Installed JREs.
7. If unresolved dependencies remain, right-click backend → **Maven → Update Project…** (Alt+F5) → force update; then Project → Clean.

If you imported it as **General → Existing Projects into Workspace**, remove that incorrect entry from the Eclipse workspace **without deleting project contents on disk**, then re-import using the Maven wizard. Maven integration (m2e) must be installed/enabled.

## Verify in a terminal

From the repository root:

```bash
mvn -version
mvn -f pom.xml validate
mvn -pl backend -am -DskipTests package
```

The import does not require a running database. Running the Spring Boot app does require the actual PostgreSQL and OYS JWT environment variables described in `README_V1.6.md`.

## Frontend is not Maven

```bash
cd frontend
npm install
npm run dev
```

The application is still a development foundation; imported Maven support does not mean that uploads, reading progress, Premium credits, or authentication integrations are complete.
