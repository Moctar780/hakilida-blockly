#!/usr/bin/env bash
# Copy web frontend files to www/ for Tauri build
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p www

# Copy all web assets
cp index.html www/
cp -r js models audio sprites www/
