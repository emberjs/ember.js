import { assert, deprecate } from 'ember-metal/debug';
import calculateLocationDisplay from 'ember-template-compiler/system/calculate-location-display';

export default function TransformOldBindingSyntax(options) {
  this.syntax = null;
  this.options = options;
}

TransformOldBindingSyntax.prototype.transform = function TransformOldBindingSyntax_transform(ast) {
  var moduleName = this.options.moduleName;
  var b = this.syntax.builders;
  var walker = new this.syntax.Walker();

  walker.visit(ast, function(node) {
    if (!validate(node)) { return; }

    each(node.hash.pairs, function(pair) {
      let { key, value } = pair;

      var sourceInformation = calculateLocationDisplay(moduleName, pair.loc);

      if (key === 'classBinding') { return; }

      assert(`Setting 'attributeBindings' via template helpers is not allowed ${sourceInformation}`, key !== 'attributeBindings');

      if (key.substr(-7) === 'Binding') {
        let newKey = key.slice(0, -7);

        deprecate(
          `You're using legacy binding syntax: ${key}=${exprToString(value)} ${sourceInformation}. Please replace with ${newKey}=${value.original}`,
          false,
          { id: 'ember-template-compiler.transform-old-binding-syntax', until: '3.0.0' }
        );

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
  for (var i = 0, l = list.length; i < l; i++) {
    callback(list[i]);
  }
}

function exprToString(expr) {
  switch (expr.type) {
    case 'StringLiteral': return `"${expr.original}"`;
    case 'PathExpression': return expr.original;
  }
}
