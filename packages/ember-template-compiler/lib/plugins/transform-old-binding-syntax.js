import { assert, deprecate } from '@ember/debug';
import { BINDING_SUPPORT } from '@ember/deprecated-features';
import calculateLocationDisplay from '../system/calculate-location-display';

export default function transformOldBindingSyntax(env) {
  if (BINDING_SUPPORT) {
    let { moduleName } = env.meta;
    let b = env.syntax.builders;

    let exprToString = expr => {
      switch (expr.type) {
        case 'StringLiteral':
          return `"${expr.original}"`;
        case 'PathExpression':
          return expr.original;
      }
    };

    let processHash = node => {
      for (let i = 0; i < node.hash.pairs.length; i++) {
        let pair = node.hash.pairs[i];
        let { key, value } = pair;

        let sourceInformation = calculateLocationDisplay(moduleName, pair.loc);

        if (key === 'classBinding') {
          return;
        }

        assert(
          `Setting 'attributeBindings' via template helpers is not allowed ${sourceInformation}`,
          key !== 'attributeBindings'
        );

        if (key.substr(-7) === 'Binding') {
          let newKey = key.slice(0, -7);

          deprecate(
            `You're using legacy binding syntax: ${key}=${exprToString(
              value
            )} ${sourceInformation}. Please replace with ${newKey}=${value.original}`,
            false,
            {
              id: 'ember-template-compiler.transform-old-binding-syntax',
              until: '3.0.0',
            }
          );

          pair.key = newKey;
          if (value.type === 'StringLiteral') {
            pair.value = b.path(value.original);
          }
        }
      }
    };

    return {
      name: 'transform-old-binding-syntax',

      visitor: {
        BlockStatement: processHash,
        MustacheStatement: processHash,
      },
    };
  }
}
