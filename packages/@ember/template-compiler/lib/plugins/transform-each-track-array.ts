import type * as AST from '@glimmer/syntax/lib/v1/api';
import type { ASTPlugin } from '@glimmer/syntax/lib/parser/tokenizer-event-handlers';
import { assert } from '@ember/debug';
import type { EmberASTPluginEnvironment } from '../types';
import {
  EACH_IN_EXPRESSIONS,
  isPath,
  keywordPath,
  TRACK_ARRAY_EXPRESSIONS,
  trackLocals,
} from './utils';

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
            (EACH_IN_EXPRESSIONS.has(firstParam) || TRACK_ARRAY_EXPRESSIONS.has(firstParam))
          ) {
            return;
          }

          let tracked = b.sexpr(keywordPath(env, '-track-array', 'trackArray'), [firstParam]);
          TRACK_ARRAY_EXPRESSIONS.add(tracked);
          node.params[0] = tracked;

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
