// Counts, over a corpus, the numeric character references whose decoded text changes when they
// are decoded as HTML does instead of with String.fromCharCode (§02-6.3, T26). A reference is
// counted wherever it appears, including in <script>, <style> and mustache strings, where it is
// not decoded, so the counts are an upper bound.
//
// Usage: node char-ref-impact.mjs ROOT...
import fs from 'node:fs';
import path from 'node:path';

const roots = process.argv.slice(2);

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

function kind(cp) {
  if (cp === 0) return 'nul';
  if (cp > 0x10ffff) return 'out-of-range';
  if (cp >= 0xd800 && cp <= 0xdfff) return 'surrogate';
  if (cp > 0xffff) return 'astral';
  if (cp >= 0x80 && cp <= 0x9f) return 'c1';
  return null;
}

const seen = new Set();
let unique = 0;
let withNumeric = 0;
const hits = {};
for (const file of files) {
  for (const src of templatesIn(file)) {
    if (seen.has(src)) continue;
    seen.add(src);
    unique++;
    const refs = [...src.matchAll(/&#(?:[xX]([0-9A-Fa-f]+)|([0-9]+));/g)];
    if (refs.length) withNumeric++;
    for (const m of refs) {
      const k = kind(m[1] ? parseInt(m[1], 16) : parseInt(m[2], 10));
      if (k) (hits[k] ??= []).push(`${file}: ${m[0]}`);
    }
  }
}

console.log(`${unique} distinct templates, ${withNumeric} with a numeric character reference`);
for (const [k, list] of Object.entries(hits)) {
  console.log(`\n${k}: ${list.length}`);
  for (const h of list) console.log(`  ${h}`);
}
if (!Object.keys(hits).length) console.log('no reference changes meaning');
