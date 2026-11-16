#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
python3 "$ROOT/tests/validate_design.py"
python3 "$ROOT/tests/security_ui_contract.py"
node "$ROOT/tests/tsx_syntax.cjs"
TEMP="$(mktemp -d)"
trap 'rm -rf "$TEMP"' EXIT
TS="${TS_COMPILER:-tsc}"
"$TS" --target ES2020 --module commonjs --strict --skipLibCheck \
  --outDir "$TEMP" "$ROOT/frontend/components/sampleData.ts" "$ROOT/frontend/lib/cataloguePagination.ts"
OYS_TEST_BUILD="$TEMP" node --test "$ROOT/tests/catalogue_pagination.test.cjs"
node "$ROOT/frontend/scripts/render-static-preview.cjs"
echo 'Offline catalogue tests and static TSX snapshots passed. No live DB/browser validation performed.'
