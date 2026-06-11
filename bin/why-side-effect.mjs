/* eslint-disable no-console */
// Explains why files are in package.json's sideEffects list: re-runs the
// same probe as the updateSideEffects rollup plugin and prints the top-level
// statements that survive tree-shaking (the roots, plus whatever they retain).
//
// Usage:
//   node bin/why-side-effect.mjs                 # every flagged dev file
//   node bin/why-side-effect.mjs <path>...       # specific dist files
import { resolve, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { probeSurvivingCode } from './side-effect-detection/index.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { parseAsync } = require('@babel/core');

function firstLine(code, node) {
  let snippet = code.slice(node.start, node.end).split('\n')[0];
  return snippet.length > 110 ? snippet.slice(0, 110) + '…' : snippet;
}

let files = process.argv.slice(2);
if (files.length === 0) {
  let manifest = JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf8'));
  files = (manifest.sideEffects ?? []).filter((f) => f.startsWith('./dist/dev/'));
}

for (let rel of files) {
  let file = resolve(projectRoot, rel);
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
