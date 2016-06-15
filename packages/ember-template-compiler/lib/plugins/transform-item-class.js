export default function TransformItemClass() {
  this.syntax = null;
}

TransformItemClass.prototype.transform = function TransformItemClass_transform(ast) {
  let b = this.syntax.builders;
  let walker = new this.syntax.Walker();

  walker.visit(ast, node => {
    if (!validate(node)) { return; }

    for (let i = 0; i < node.hash.pairs.length; i++) {
      let pair = node.hash.pairs[i];
      let { key, value } = pair;

      if (key !== 'itemClass') { return; }
      if (value.type === 'StringLiteral') { return; }

      let propName = value.original;
      let params = [value];
      let sexprParams = [b.string(propName), b.path(propName)];

      params.push(b.sexpr(b.string('-normalize-class'), sexprParams));
      let sexpr = b.sexpr(b.string('if'), params);

      pair.value = sexpr;
    }
  });

  return ast;
};

function validate(node) {
  return (node.type === 'BlockStatement' || node.type === 'MustacheStatement') &&
         node.path.original === 'collection';
}
