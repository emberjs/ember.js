import Ember from 'ember-metal/core';

export default function TransformOldBindingSyntax() {
  this.syntax = null;
}

TransformOldBindingSyntax.prototype.transform = function TransformOldBindingSyntax_transform(ast) {
  var b = this.syntax.builders;
  var walker = new this.syntax.Walker();

  walker.visit(ast, function(node) {
    if (!validate(node)) { return; }

    each(node.hash.pairs, function(pair) {
      let { key, value } = pair;

      var sourceInformation = '';

      if (pair.loc) {
        let { start, source } = pair.loc;

        sourceInformation = `@ ${start.line}:${start.column} in ${source || '(inline)'}`;
      }

      if (key === 'classBinding') { return; }

      Ember.assert(`Setting 'attributeBindings' via template helpers is not allowed ${sourceInformation}`, key !== 'attributeBindings');

      if (key.substr(-7) === 'Binding') {
        let newKey = key.slice(0, -7);

        Ember.deprecate(`You're using legacy binding syntax: ${key}=${exprToString(value)} ${sourceInformation}. Please replace with ${newKey}=${value.original}`);

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
  return (node.type === 'BlockStatement' || node.type === 'MustacheStatement');
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
