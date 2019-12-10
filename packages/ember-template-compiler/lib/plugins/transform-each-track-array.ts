import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';
import { isPath } from './utils';

/**
 @module ember
*/

/**
  A Glimmer2 AST transformation that replaces all instances of

  ```handlebars
  {{#each iterableThing as |key value|}}
  ```

  with

  ```handlebars
  {{#each (-track-array iterableThing) as |key value|}}
  ```

  @private
  @class TransformHasBlockSyntax
*/
export default function transformEachTrackArray(env: ASTPluginEnvironment): ASTPlugin {
  let { builders: b } = env.syntax;

  return {
    name: 'transform-each-track-array',

    visitor: {
      BlockStatement(node: AST.BlockStatement): AST.Node | void {
        if (isPath(node.path) && node.path.original === 'each') {
          let firstParam = node.params[0];

          if (
            firstParam.type === 'SubExpression' &&
            firstParam.path.type === 'PathExpression' &&
            firstParam.path.original === '-each-in'
          ) {
            return;
          }

          node.params[0] = b.sexpr(b.path('-track-array'), [node.params[0]]);

          return b.block(
            b.path('each'),
            node.params,
            node.hash,
            node.program,
            node.inverse,
            node.loc
          );
        }
      },
    },
  };
}
