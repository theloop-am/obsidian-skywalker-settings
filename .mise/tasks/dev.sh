#!/usr/bin/env bash
#MISE description="Watch src/, copy into the vault and reload — VAULT=/path/to/vault mise run dev"
#MISE dir="{{config_root}}"
set -euo pipefail

# The watch loop lives in esbuild because only esbuild knows when a rebuild
# finished; a task that copies once cannot follow a file being saved.
exec node esbuild.config.mjs "$@"
