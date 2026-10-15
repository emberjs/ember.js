// Measures, over a corpus, the templates whose parse would change if the parser gave the HTML
// tokenizer priority everywhere instead of running Handlebars first (§02-1.4). Reports:
//   comments  HTML comments whose value is not the raw source up to the first `-->` (§02-6.7)
//   escapes   adjacent text nodes, which only an escape `\{{` produces (§02-2.2)
//   pre       newlines dropped inside <pre>/<textarea> anywhere but right after the start tag
//             (§02-6.8)
//
// Usage: node html-first-impact.mjs REPO ROOT...
//   REPO: an ember.js checkout with `pnpm rollup --config` already run
//   ROOT: directories to search, as for compare-parsers.mjs
//
// The pre check instruments a copy of the bundled tokenizer, written next to the bundle.
import fs from 'node:fs';
import path from 'node:path';

const [repo, ...roots] = process.argv.slice(2);
const bundle = path.resolve(repo, 'packages/@glimmer/syntax/dist/es/index.js');
const branch = `if (tag === 'pre' || tag === 'textarea') {\n              this.consume();`;
const patchedSrc = fs.readFileSync(bundle, 'utf8').replace(
  branch,
  `if (tag === 'pre' || tag === 'textarea') {\n              globalThis.__preDrops.push(this.input.slice(0, this.index));\n              this.consume();`
);
if (!patchedSrc.includes('__preDrops')) throw new Error('tokenizer pre/textarea branch not found');
const patched = bundle.replace(/index\.js$/, 'index.html-first-impact.mjs');
fs.writeFileSync(patched, patchedSrc);
const syntax = await import(patched);
fs.unlinkSync(patched);

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

function lineStarts(src) {
  const starts = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === '\n') starts.push(i + 1);
  return starts;
}

// A drop is the HTML one when the chunk fed so far ends with the <pre>/<textarea> start tag. A
// chunk with no `<` before the `>` is the rest of a start tag interrupted by a mustache.
function rightAfterStartTag(fed) {
  if (!fed.endsWith('>')) return false;
  const lt = fed.lastIndexOf('<');
  return lt === -1 || /^<(pre|textarea)\b/i.test(fed.slice(lt));
}

const seen = new Set();
let unique = 0;
const hits = { comments: [], escapes: [], pre: [] };
for (const file of files) {
  for (const src of templatesIn(file)) {
    if (seen.has(src)) continue;
    seen.add(src);
    unique++;
    globalThis.__preDrops = [];
    let ast;
    try {
      ast = syntax.preprocess(src, { meta: { moduleName: 'x' } });
    } catch {
      continue;
    }
    if (globalThis.__preDrops.some((fed) => !rightAfterStartTag(fed))) hits.pre.push({ file, src });
    const starts = lineStarts(src);
    let comment = false;
    let escape = false;
    const adjacentText = (list) =>
      list.some((n, i) => i > 0 && n.type === 'TextNode' && list[i - 1].type === 'TextNode');
    syntax.traverse(ast, {
      CommentStatement(node) {
        if (!node.value.includes('{{')) return;
        const { line, column } = node.loc.start;
        const open = starts[line - 1] + column + '<!--'.length;
        const end = src.indexOf('-->', open);
        if ((end === -1 ? null : src.slice(open, end)) !== node.value) comment = true;
      },
      Template(node) {
        if (adjacentText(node.body)) escape = true;
      },
      Block(node) {
        if (adjacentText(node.body)) escape = true;
      },
      ElementNode(node) {
        if (adjacentText(node.children)) escape = true;
      },
    });
    if (comment) hits.comments.push({ file, src });
    if (escape) hits.escapes.push({ file, src });
  }
}

console.log(`${unique} distinct templates`);
for (const [kind, list] of Object.entries(hits)) {
  console.log(`\n${kind}: ${list.length}`);
  for (const h of list) console.log(`  ${h.file}`);
}
