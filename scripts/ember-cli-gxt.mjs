#!/usr/bin/env node
// scripts/ember-cli-gxt.mjs
// Minimal install-UX CLI that toggles the GXT render backend for a
// consuming app by flipping `ember-addon.backend` in its package.json.
//
// Usage:
//   npx ember-cli-gxt enable
//   npx ember-cli-gxt disable
//   npx ember-cli-gxt status
//
// This is PREVIEW software. See rfcs/text/0000-gxt-dual-backend.md.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const command = process.argv[2];
const pkgPath = resolve(process.cwd(), 'package.json');

if (!existsSync(pkgPath)) {
  console.error('error: no package.json in current directory');
  process.exit(1);
}

function readPkg() {
  return JSON.parse(readFileSync(pkgPath, 'utf-8'));
}

function writePkg(pkg) {
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

if (command === 'enable') {
  const pkg = readPkg();
  pkg['ember-addon'] = pkg['ember-addon'] ?? {};
  pkg['ember-addon'].backend = 'gxt';
  writePkg(pkg);
  console.log('ok: GXT backend enabled in package.json');
  console.log('    run `pnpm install` (or npm/yarn) to pick up the change.');
  console.log('    WARNING: this is preview software. See rfcs/text/0000-gxt-dual-backend.md.');
} else if (command === 'disable') {
  const pkg = readPkg();
  if (pkg['ember-addon']?.backend) {
    delete pkg['ember-addon'].backend;
    if (Object.keys(pkg['ember-addon']).length === 0) {
      delete pkg['ember-addon'];
    }
    writePkg(pkg);
    console.log('ok: GXT backend disabled, restored to classic');
  } else {
    console.log('ok: GXT backend was not enabled (already on classic)');
  }
} else if (command === 'status') {
  const pkg = readPkg();
  const backend = pkg['ember-addon']?.backend ?? 'classic (default)';
  console.log(`Backend: ${backend}`);
} else {
  console.log('Usage: ember-cli-gxt <enable|disable|status>');
  process.exit(1);
}
