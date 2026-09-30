import { preprocess } from '/Users/edward/hacking/ember.js/packages/@glimmer/syntax/dist/es/index.js';
import fs from 'fs';
const cases = JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
function compact(n) {
  if (Array.isArray(n)) return n.map(compact).join(' ');
  if (!n || typeof n !== 'object') return JSON.stringify(n);
  switch (n.type) {
    case 'TextNode': return 'T' + JSON.stringify(n.chars);
    case 'CommentStatement': return '<!--' + JSON.stringify(n.value) + '-->';
    case 'MustacheCommentStatement': return '{{!' + JSON.stringify(n.value) + '}}';
    case 'PathExpression': return (n.head.type==='ThisHead'?'this':n.head.name) + (n.tail.length? '|' + n.tail.map(x=>JSON.stringify(x)).join('|'):'') + '<'+JSON.stringify(n.original)+'>';
    case 'StringLiteral': case 'NumberLiteral': case 'BooleanLiteral': case 'NullLiteral': return 'L' + JSON.stringify(n.value);
    case 'UndefinedLiteral': return 'Lundefined';
    case 'SubExpression': return '(' + call(n) + ')';
    case 'MustacheStatement': return (n.trusting?'{{{':'{{') + call(n) + (n.strip.open||n.strip.close?' strip='+(n.strip.open?'L':'')+(n.strip.close?'R':''):'') + (n.trusting?'}}}':'}}');
    case 'BlockStatement': return '{{#' + call(n) + (n.program.blockParams.length?' as |'+n.program.blockParams.join(' ')+'|':'') + '}}[' + compact(n.program.body) + ']' + (n.inverse ? '{{else}}' + (n.inverse.chained?'(chained)':'')+'[' + compact(n.inverse.body) + ']' : '') + '{{/}}';
    case 'ElementNode': return '<' + n.tag + (n.attributes.length? ' ' + n.attributes.map(a => a.name + '=' + compact(a.value)).join(' '):'') + (n.modifiers.length? ' MODS:' + n.modifiers.map(m=>'{{'+call(m)+'}}').join(' '):'') + (n.comments.length?' COMMENTS:'+compact(n.comments):'') + (n.blockParams.length?' as |'+n.blockParams.join(' ')+'|':'') + (n.selfClosing?'/':'') + '>[' + compact(n.children) + ']';
    case 'ConcatStatement': return 'CONCAT(' + compact(n.parts) + ')';
  }
  return JSON.stringify(n);
}
function call(n) { return compact(n.path) + (n.params.length? ' ' + compact(n.params):'') + (n.hash.pairs.length? ' ' + n.hash.pairs.map(p=>p.key+'='+compact(p.value)).join(' '):''); }
for (const c of cases) {
  const [src, opts] = Array.isArray(c) ? c : [c];
  let out;
  try {
    const ast = preprocess(src, opts ? (typeof opts === 'string' ? {mode: opts} : opts) : {});
    out = compact(ast.body);
  } catch (e) { out = 'ERROR(' + e.constructor.name + '): ' + e.message.split('\n')[0]; }
  console.log(JSON.stringify(src) + (opts?' '+JSON.stringify(opts):'') + '\n   => ' + out);
}
