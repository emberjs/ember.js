import { assert, deprecate } from 'ember-debug';
import calculateLocationDisplay from '../system/calculate-location-display';

export default function TransformOldBindingSyntax(options) {
  this.syntax = null;
  this.options = options;
}

TransformOldBindingSyntax.prototype.transform = function TransformOldBindingSyntax_transform(ast) {
  let moduleName = this.options.meta.moduleName;
  let b = this.syntax.builders;
  let walker = new this.syntax.Walker();

  walker.visit(ast, node => {
    if (!validate(node)) { return; }

    for (let i = 0; i < node.hash.pairs.length; i++) {
      let pair = node.hash.pairs[i];
      let { key, value } = pair;

      let sourceInformation = calculateLocationDisplay(moduleName, pair.loc);

      if (key === 'classBinding') { return; }

      assert(`Setting 'attributeBindings' via template helpers is not allowed ${sourceInformation}`, key !== 'attributeBindings');

      if (key.substr(-7) === 'Binding') {
        let newKey = key.slice(0, -7);

        deprecate(
          `You're using legacy binding syntax: ${key}=${exprToString(value)} ${sourceInformation}. Please replace with ${newKey}=${value.original}`,
          false,
          { id: 'ember-template-compiler.transform-old-binding-syntax', since: '2.1.0', until: '3.0.0' }
        );

        pair.key = newKey;
        if (value.type === 'StringLiteral') {
          pair.value = b.path(value.original);
        }
      }
    }
  });

  return ast;
};

function validate(node) {
  return (node.type === 'BlockStatement' || node.type === 'MustacheStatement');
}

function exprToString(expr) {
  switch (expr.type) {
    case 'StringLiteral': return `"${expr.original}"`;
    case 'PathExpression': return expr.original;
  }
}
