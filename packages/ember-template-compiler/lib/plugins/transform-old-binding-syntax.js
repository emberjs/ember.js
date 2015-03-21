export default function TransformEachIntoCollection() {
  this.syntax = null;
}

TransformEachIntoCollection.prototype.transform = function TransformEachIntoCollection_transform(ast) {
  var b = this.syntax.builders;
  var walker = new this.syntax.Walker();

  walker.visit(ast, function(node) {
    if (!validate(node)) { return; }

    each(node.sexpr.hash.pairs, function(pair) {
      let { key, value } = pair;
      let { start, source } = pair.loc;

      if (key === 'classBinding') { return; }

      Ember.assert(`Setting 'attributeBindings' via template helpers is not allowed @ ${start.line}:${start.column} in ${source || '(inline)'}`, key !== 'attributeBindings');

      if (key.substr(-7) === 'Binding') {
        let newKey = key.slice(0, -7);

        Ember.deprecate(`You're using legacy binding syntax: ${key}=${exprToString(value)} at ${start.line}:${start.column} in ${source || '(inline)'}. Please replace with ${newKey}=${value.original}`);

        pair.key = newKey;
        if (value.type === 'StringLiteral') {
          pair.value = b.path(value.original);
        }
      }
    });
  });

  return ast;
};

function validate(node) {
  return (node.type === 'BlockStatement' || node.type === 'MustacheStatement') &&
    node.sexpr.path.original === 'view';
}

function each(list, callback) {
  for (var i=0, l=list.length; i<l; i++) {
    callback(list[i]);
  }
}

function exprToString(expr) {
  switch (expr.type) {
    case 'StringLiteral': return `"${expr.original}"`;
    case 'PathExpression': return expr.original;
  }
}
