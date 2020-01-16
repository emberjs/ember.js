import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';
import { isPath } from './utils';
/**
 @module ember
*/

/**
  A Glimmer2 AST transformation that replaces all instances of

  ```handlebars
 {{hasBlock}}
  ```

  with

  ```handlebars
 {{has-block}}
  ```

  @private
  @class TransformHasBlockSyntax
*/

const TRANSFORMATIONS = {
  hasBlock: 'has-block',
  hasBlockParams: 'has-block-params',
};

export default function transformHasBlockSyntax(env: ASTPluginEnvironment): ASTPlugin {
  let { builders: b } = env.syntax;

  return {
    name: 'transform-has-block-syntax',

    visitor: {
      PathExpression(node: AST.PathExpression): AST.Node | void {
        if (TRANSFORMATIONS[node.original]) {
          return b.sexpr(b.path(TRANSFORMATIONS[node.original]));
        }
      },
      MustacheStatement(node: AST.MustacheStatement): AST.Node | void {
        if (isPath(node.path) && TRANSFORMATIONS[node.path.original]) {
          return b.mustache(
            b.path(TRANSFORMATIONS[node.path.original]),
            node.params,
            node.hash,
            undefined,
            node.loc
          );
        }
      },
      SubExpression(node: AST.SubExpression): AST.Node | void {
        if (isPath(node.path) && TRANSFORMATIONS[node.path.original]) {
          return b.sexpr(b.path(TRANSFORMATIONS[node.path.original]), node.params, node.hash);
        }
      },
    },
  };
}
