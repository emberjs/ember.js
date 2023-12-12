import { assert } from '@ember/debug';
import type { AST, ASTPlugin } from '@glimmer/syntax';
import type { EmberASTPluginEnvironment } from '../types';
import { isPath } from './utils';

/**
 @module ember
*/

/**
  A Glimmer2 AST transformation that handles the public `{{in-element}}` as per RFC287.

  Issues a build time assertion for:

  ```handlebars
  {{#in-element someElement insertBefore="some-none-null-value"}}
    {{modal-display text=text}}
  {{/in-element}}
  ```

  @private
  @class TransformInElement
*/
export default function transformInElement(env: EmberASTPluginEnvironment): ASTPlugin {
  let { builders: b } = env.syntax;

  return {
    name: 'transform-in-element',

    visitor: {
      BlockStatement(node: AST.BlockStatement) {
        if (!isPath(node.path)) return;

        if (node.path.original === 'in-element') {
          let originalValue = node.params[0];

          if (originalValue && !env.isProduction) {
            let subExpr = b.sexpr('-in-el-null', [originalValue]);

            node.params.shift();
            node.params.unshift(subExpr);
          }

          node.hash.pairs.forEach((pair) => {
            if (pair.key === 'insertBefore') {
              assert(
                `Can only pass null to insertBefore in in-element, received: ${JSON.stringify(
                  pair.value
                )}`,
                pair.value.type === 'NullLiteral' || pair.value.type === 'UndefinedLiteral'
              );
            }
          });
        }
      },
    },
  };
}
