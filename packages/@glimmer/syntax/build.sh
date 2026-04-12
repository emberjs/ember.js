#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🦀 Building Glimmer template parser (WASM)..."

# Clean previous builds
rm -rf pkg/standalone pkg/wasm-bytes.mjs

# Build only the web (standalone) target. We use a universal wrapper
# (pkg/universal.mjs) that inlines the WASM bytes as base64, so there's
# no need for separate Node/bundler targets.
echo "  → Building web target..."
wasm-pack build --target web --out-dir pkg/standalone 2>&1 | grep -v "^warning:" || true

# Remove files that cause build:types issues
rm -f pkg/standalone/.gitignore
rm -f pkg/standalone/glimmer_template_parser_bg.wasm.d.ts

# Generate the base64-encoded WASM bytes module for the universal wrapper
echo "  → Generating wasm-bytes.mjs..."
node -e "
const fs = require('fs');
const wasm = fs.readFileSync('pkg/standalone/glimmer_template_parser_bg.wasm');
const base64 = wasm.toString('base64');
const content = 'export const WASM_BYTES_BASE64 = ' + JSON.stringify(base64) + ';\n';
fs.writeFileSync('pkg/wasm-bytes.mjs', content);
console.log('    wasm-bytes.mjs: ' + (content.length / 1024).toFixed(1) + 'KB');
"

echo "✅ Build complete!"
ls -lh pkg/standalone/glimmer_template_parser_bg.wasm pkg/wasm-bytes.mjs pkg/universal.mjs
