#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🦀 Building Glimmer template parser (WASM)..."

# Clean previous builds
rm -rf pkg

# Build for web (ESM, browser + bundler)
echo "  → Building web target..."
wasm-pack build --target web --out-dir pkg/standalone 2>&1 | grep -v "^warning:"

# Build for Node.js (CommonJS)
echo "  → Building Node.js target..."
wasm-pack build --target nodejs --out-dir pkg/node 2>&1 | grep -v "^warning:"

# Rename node output to .cjs for dual ESM/CJS support
if [ -f pkg/node/glimmer_template_parser.js ]; then
  mv pkg/node/glimmer_template_parser.js pkg/node/glimmer_template_parser.cjs
fi

# Remove auto-generated .gitignore (we want these files in the package)
rm -f pkg/standalone/.gitignore pkg/node/.gitignore

echo "✅ Build complete!"
echo "   Web:  pkg/standalone/"
echo "   Node: pkg/node/"
ls -lh pkg/standalone/glimmer_template_parser_bg.wasm
