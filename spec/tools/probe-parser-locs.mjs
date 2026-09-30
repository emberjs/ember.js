import { preprocess, traverse } from '/Users/edward/hacking/ember.js/packages/@glimmer/syntax/dist/es/index.js';
const src = process.argv[2];
const ast = preprocess(src);
const out = [];
function l(x){ const j = x.loc.toJSON(); return `${j.start.line}:${j.start.column}-${j.end.line}:${j.end.column} ${JSON.stringify(x.loc.asString())}`; }
function walk(n, d) {
  if (!n || typeof n !== 'object') return;
  if (Array.isArray(n)) { n.forEach(x => walk(x, d)); return; }
  if (n.type && n.loc) console.log(' '.repeat(d) + n.type + ' ' + l(n));
  if (n.type === 'ElementNode') { console.log(' '.repeat(d+1) + 'openTag ' + JSON.stringify(n.openTag.asString()) + ' closeTag ' + (n.closeTag && JSON.stringify(n.closeTag.asString())) + ' path ' + l(n.path)); n.params.forEach(p => console.log(' '.repeat(d+1)+'param '+l(p))); }
  if (n.type === 'Block') n.params.forEach(p => console.log(' '.repeat(d+1)+'param '+l(p)));
  if (n.type === 'PathExpression') { console.log(' '.repeat(d+1) + 'head ' + l(n.head)); return; }
  for (const k of ['body','path','params','hash','pairs','value','program','inverse','attributes','modifiers','children','comments','parts']) if (n[k] && k!=='params' || (k==='params' && n.type!=='Block' && n.type!=='ElementNode' && n[k])) walk(n[k], d+1);
}
walk(ast, 0);
