"""Static environment setup checks; not a substitute for running Spring Boot."""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
backend = (root / 'backend/.env.example').read_text()
frontend = (root / 'frontend/.env.example').read_text()
yaml = (root / 'backend/src/main/resources/application.yml').read_text()
gitignore = (root / '.gitignore').read_text()
setup_win = (root / 'setup-env.cmd').read_text()
setup_sh = (root / 'setup-env.sh').read_text()

checks = {
    'backend_template_has_required_keys': all(f'{key}=' in backend for key in (
        'OYS_DB_URL', 'OYS_DB_USER', 'OYS_DB_PASSWORD',
        'OYS_JWT_ISSUER', 'OYS_JWKS_URI', 'OYS_JWT_AUDIENCE', 'PORT')),
    'frontend_template_has_preview_flag': 'OYS_PREVIEW_MODE=true' in frontend,
    'spring_loads_env_in_backend_workdir': 'optional:file:./.env[.properties]' in yaml,
    'spring_loads_env_in_repo_workdir': 'optional:file:./backend/.env[.properties]' in yaml,
    'spring_has_no_db_password_fallback': 'password: ${OYS_DB_PASSWORD}' in yaml,
    'spring_has_no_issuer_fallback': 'issuer-uri: ${OYS_JWT_ISSUER}' in yaml,
    'spring_has_no_jwks_fallback': 'jwk-set-uri: ${OYS_JWKS_URI}' in yaml,
    'git_ignores_local_env': '.env\n' in gitignore and '.env.*' in gitignore,
    'git_keeps_examples': '!.env.example' in gitignore,
    'windows_setup_preserves_existing_secrets': r'if not exist "%ROOT%backend\.env"' in setup_win,
    'posix_setup_preserves_existing_secrets': 'if [[ -e "$ROOT/$component/.env" ]]' in setup_sh,
    'no_secret_in_frontend_template': 'OYS_DB_PASSWORD=' not in frontend and 'JWT_PRIVATE' not in frontend,
}
for name, ok in checks.items():
    print(f'{"PASS" if ok else "FAIL"}: {name}')
if not all(checks.values()):
    raise SystemExit(1)
print(f'Env config checks passed: {sum(checks.values())}/{len(checks)}')
