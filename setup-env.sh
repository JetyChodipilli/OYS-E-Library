#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
umask 077
for component in backend frontend infrastructure/keycloak; do
  if [[ -e "$ROOT/$component/.env" ]]; then
    echo "Preserved existing $component/.env"
  else
    cp "$ROOT/$component/.env.example" "$ROOT/$component/.env"
    echo "Created $component/.env"
  fi
done
if [[ -e "$ROOT/frontend/.env.local" ]]; then
  echo 'NOTE: frontend/.env.local takes precedence over frontend/.env in Next.js.'
fi
echo 'Set the database password and local Keycloak admin password. See ENV_SETUP.md.'
