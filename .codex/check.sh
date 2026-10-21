#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

[[ -x .venv/bin/python ]] || { echo "Run bash .codex/setup.sh first." >&2; exit 1; }
pnpm test
node scripts/build-static.cjs
.venv/bin/python tests/sign-pdf.py
echo "Cloud checks passed: CRM regressions, static assets, PDF fixtures."
echo "Before merging, also require the Chrome and WebKit jobs in GitHub Actions."
