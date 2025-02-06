import type { AST, ASTPlugin } from '@glimmer/ember/syntax';
import { assert } from '@ember/debug';
import type { EmberASTPluginEnvironment } from '../types';
import { isPath, trackLocals } from './utils';

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
export default function transformEachTrackArray(env: EmberASTPluginEnvironment): ASTPlugin {
  let { builders: b } = env.syntax;
  let { hasLocal, visitor } = trackLocals(env);

  return {
    name: 'transform-each-track-array',

    visitor: {
      ...visitor,
      BlockStatement(node: AST.BlockStatement): AST.Node | void {
        if (isPath(node.path) && node.path.original === 'each' && !hasLocal('each')) {
          let firstParam = node.params[0];
          assert('has firstParam', firstParam);

          if (
            firstParam.type === 'SubExpression' &&
            firstParam.path.type === 'PathExpression' &&
            firstParam.path.original === '-each-in'
          ) {
            return;
          }

          node.params[0] = b.sexpr(b.path('-track-array'), [firstParam]);

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
