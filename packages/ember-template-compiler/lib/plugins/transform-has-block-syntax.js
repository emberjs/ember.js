/**
 @module ember
 @submodule ember-glimmer
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
  hasBlockParams: 'has-block-params'
};

export default function transformHasBlockSyntax(env) {
  let { builders: b } = env.syntax;

  return {
    name: 'transform-has-block-syntax',

    visitors: {
      PathExpression(node) {
        if (TRANSFORMATIONS[node.original]) {
          return b.sexpr(b.path(TRANSFORMATIONS[node.original]));
        }
      },
      MustacheStatement(node) {
        if (TRANSFORMATIONS[node.path.original]) {
          return b.mustache(b.path(TRANSFORMATIONS[node.path.original]), node.params, node.hash, null, node.loc);
        }
      },
      SubExpression(node) {
        if (TRANSFORMATIONS[node.path.original]) {
          return b.sexpr(b.path(TRANSFORMATIONS[node.path.original]), node.params, node.hash);
        }
      }
    }
  }
}
