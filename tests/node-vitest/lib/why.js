/* eslint-disable no-console */
// Debug helper for the tree-shakability test: runs the same side-effect probe
// as ./find-side-effects.mjs against the module files you pass, and prints the
// top-level statements that survive tree-shaking — i.e. *why* a module is
// considered to have side effects. Standalone tool; not wired into the build.
//
// Usage:
//   node tests/node-vitest/lib/why.js <file>...   # explain specific module files
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { probeSurvivingCode } from './detect.js';

const require = createRequire(import.meta.url);
const { parseAsync } = require('@babel/core');

function firstLine(code, node) {
  let snippet = code.slice(node.start, node.end).split('\n')[0];
  return snippet.length > 110 ? snippet.slice(0, 110) + '…' : snippet;
}

let files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node tests/node-vitest/lib/why.js <file>...');
  process.exit(1);
}

for (let rel of files) {
  let file = resolve(rel);
  let code = await probeSurvivingCode(file);
  let ast = await parseAsync(code, { configFile: false, babelrc: false });
  let survivors = [];
  for (let node of ast.program.body) {
    // imports and function declarations are only retained as dependencies of
    // the real roots
    if (node.type === 'ImportDeclaration' || node.type === 'FunctionDeclaration') continue;
    if (node.type === 'ExportNamedDeclaration' && !node.declaration) continue;
    survivors.push(`${node.type}: ${firstLine(code, node)}`);
  }
  console.log(`\n=== ${rel} (${survivors.length} survivors)`);
  for (let line of survivors) console.log('  ' + line);
}
