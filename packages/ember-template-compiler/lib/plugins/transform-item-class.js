export default function TransformItemClass() {
  this.syntax = null;
}

TransformItemClass.prototype.transform = function TransformItemClass_transform(ast) {
  var b = this.syntax.builders;
  var walker = new this.syntax.Walker();

  walker.visit(ast, function(node) {
    if (!validate(node)) { return; }

    each(node.hash.pairs, function(pair) {
      let { key, value } = pair;

      if (key !== 'itemClass') { return; }
      if (value.type === 'StringLiteral') { return; }

      let propName = value.original;
      let params = [value];
      let sexprParams = [b.string(propName), b.path(propName)];

      params.push(b.sexpr(b.string('-normalize-class'), sexprParams));
      let sexpr = b.sexpr(b.string('if'), params);

      pair.value = sexpr;
    });
  });

  return ast;
};

function validate(node) {
  return (node.type === 'BlockStatement' || node.type === 'MustacheStatement') &&
         node.path.original === 'collection';
}

function each(list, callback) {
  for (var i = 0, l = list.length; i<l; i++) {
    callback(list[i]);
  }
}
