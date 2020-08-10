import { AST, ASTPlugin } from '@glimmer/syntax';
import { EmberASTPluginEnvironment } from '../types';
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
  {{component (-outlet)}}
  ```

  @private
  @class TransformHasBlockSyntax
*/
export default function transformWrapMountAndOutlet(env: EmberASTPluginEnvironment): ASTPlugin {
  let { builders: b } = env.syntax;

  let { hasLocal, node } = trackLocals();

  return {
    name: 'transform-wrap-mount-and-outlet',

    visitor: {
      Program: node,
      ElementNode: node,

      MustacheStatement(node: AST.MustacheStatement): AST.Node | void {
        if (
          isPath(node.path) &&
          (node.path.original === 'mount' || node.path.original === 'outlet') &&
          !hasLocal(node.path.original)
        ) {
          let subexpression = b.sexpr(
            b.path(`-${node.path.original}`),
            node.params,
            node.hash,
            node.loc
          );

          return b.mustache(b.path('component'), [subexpression], b.hash(), undefined, node.loc);
        }
      },
    },
  };
}
