import type * as AST from '@glimmer/syntax/lib/v1/api';
import type { ASTPlugin } from '@glimmer/syntax/lib/parser/tokenizer-event-handlers';
import type { EmberASTPluginEnvironment } from '../types';
import { isPath, trackLocals } from './utils';

/**
 @module ember
*/

/**
  A Glimmer2 AST transformation that replaces all instances of

  ```handlebars
  {{mount "engine" model=this.model}}
  ```

  with

  ```handlebars
  {{component (-mount "engine" model=this.model)}}
  ```

  and

  ```handlebars
  {{outlet}}
  ```

  with

  ```handlebars
  <@outlet />
  ```

  @private
  @class TransformWrapMountAndOutlet
*/
export default function transformWrapMountAndOutlet(env: EmberASTPluginEnvironment): ASTPlugin {
  let { builders: b } = env.syntax;

  let { hasLocal, visitor } = trackLocals(env);

  return {
    name: 'transform-wrap-mount-and-outlet',

    visitor: {
      ...visitor,

      MustacheStatement(node: AST.MustacheStatement): AST.Node | void {
        if (!isPath(node.path) || hasLocal(node.path.original)) {
          return;
        }

        if (node.path.original === 'mount') {
          let subexpression = b.sexpr(b.path('-mount'), node.params, node.hash, node.loc);

          return b.mustache(b.path('component'), [subexpression], b.hash(), undefined, node.loc);
        }

        if (node.path.original === 'outlet') {
          return b.element(
            { path: b.fullPath(b.at('@outlet')), selfClosing: true },
            { loc: node.loc }
          );
        }
      },
    },
  };
}
