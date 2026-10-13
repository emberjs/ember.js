// Parses every template found under the given roots with two builds of `@glimmer/syntax` and
// reports templates that the "before" build accepts and the "after" build rejects (and the
// reverse). Templates are `.hbs` files and the bodies of `<template>` tags in `.gjs`/`.gts`
// files.
//
// Usage: node compare-parsers.mjs BEFORE_REPO AFTER_REPO ROOT...
//   BEFORE_REPO, AFTER_REPO: ember.js checkouts with `pnpm rollup --config` already run
//   ROOT: directories to search (node_modules is searched too, symlinks are not followed)
import fs from 'node:fs';
import path from 'node:path';

const [beforeRepo, afterRepo, ...roots] = process.argv.slice(2);
const load = (repo) => import(path.join(repo, 'packages/@glimmer/syntax/dist/es/index.js'));
const before = await load(beforeRepo);
const after = await load(afterRepo);

const seen = new Set();
const files = [];
function walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.isSymbolicLink()) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '.git' || e.name === 'dist' || e.name === 'tmp') continue;
      walk(p);
    } else if (/\.(hbs|gjs|gts)$/.test(e.name)) {
      files.push(p);
    }
  }
}
for (const root of roots) walk(path.resolve(root));

function templatesIn(file) {
  const text = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.hbs')) return [text];
  return [...text.matchAll(/<template>([\s\S]*?)<\/template>/g)].map((m) => m[1]);
}

function outcome(mod, src) {
  try {
    mod.preprocess(src, { meta: { moduleName: 'x' } });
    return 'ok';
  } catch (e) {
    return 'error: ' + String(e.message).split('\n')[0];
  }
}

let count = 0;
let unique = 0;
const changed = [];
for (const file of files) {
  for (const src of templatesIn(file)) {
    count++;
    if (seen.has(src)) continue;
    seen.add(src);
    unique++;
    const a = outcome(before, src);
    const b = outcome(after, src);
    if ((a === 'ok') !== (b === 'ok')) changed.push({ file, before: a, after: b });
  }
}

console.log(`${files.length} files, ${count} templates, ${unique} distinct`);
console.log(`${changed.length} templates change between accepted and rejected`);
for (const c of changed) console.log(`${c.file}\n  before: ${c.before}\n  after:  ${c.after}`);
