#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

node -e 'const major = Number(process.versions.node.split(".")[0]); if (![22,24].includes(major)) { console.error("Use Node.js 22 or 24 for this project."); process.exit(1); }'
command -v pnpm >/dev/null || { echo "Install pnpm 10 in the cloud image before running setup." >&2; exit 1; }
[[ "$(pnpm --version)" == 10.* ]] || { echo "Use pnpm 10." >&2; exit 1; }
python3 -c 'import sys; assert sys.version_info >= (3,12), "Use Python 3.12 or newer"'

pnpm install --frozen-lockfile --prod=false
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
echo "Setup complete. Run: bash .codex/check.sh"
