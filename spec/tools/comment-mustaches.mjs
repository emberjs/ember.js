// Finds templates whose HTML comments contain mustache syntax, and reports the ones whose
// comment the spec's rule (§02-6.7: `{{` starts nothing inside an HTML comment, which ends at the
// first `-->`) would change. A comment is unchanged when its current value equals the raw source
// between its `<!--` and the first `-->` after it.
//
// Usage: node comment-mustaches.mjs REPO ROOT...
//   REPO: an ember.js checkout with `pnpm rollup --config` already run
//   ROOT: directories to search, as for compare-parsers.mjs
import fs from 'node:fs';
import path from 'node:path';

const [repo, ...roots] = process.argv.slice(2);
const syntax = await import(path.resolve(repo, 'packages/@glimmer/syntax/dist/es/index.js'));

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

// Offsets of each line start, to turn the parser's line/column locations into offsets.
function lineStarts(src) {
  const starts = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === '\n') starts.push(i + 1);
  return starts;
}

const seen = new Set();
let unique = 0;
let withMustacheComments = 0;
const changed = [];
for (const file of files) {
  for (const src of templatesIn(file)) {
    if (seen.has(src)) continue;
    seen.add(src);
    unique++;
    if (!/<!--[\s\S]*\{\{/.test(src)) continue;
    let ast;
    try {
      ast = syntax.preprocess(src, { meta: { moduleName: 'x' } });
    } catch {
      continue;
    }
    const starts = lineStarts(src);
    let hasOne = false;
    syntax.traverse(ast, {
      CommentStatement(node) {
        if (!node.value.includes('{{')) return;
        hasOne = true;
        const { line, column } = node.loc.start;
        const open = starts[line - 1] + column + '<!--'.length;
        const end = src.indexOf('-->', open);
        const spec = end === -1 ? null : src.slice(open, end);
        if (spec !== node.value) changed.push({ file, current: node.value, spec });
      },
    });
    if (hasOne) withMustacheComments++;
  }
}

console.log(`${unique} distinct templates, ${withMustacheComments} with mustache syntax in an HTML comment`);
console.log(`${changed.length} comments change under the spec's rule`);
for (const c of changed) {
  console.log(`${c.file}\n  current: ${JSON.stringify(c.current)}\n  spec:    ${JSON.stringify(c.spec)}`);
}
