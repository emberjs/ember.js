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

export default function TransformHasBlockSyntax() {
  // set later within Glimmer2 to the syntax package
  this.syntax = null;
}

const TRANSFORMATIONS = {
  hasBlock: 'has-block',
  hasBlockParams: 'has-block-params'
};

/**
  @private
  @method transform
  @param {AST} ast The AST to be transformed.
*/
TransformHasBlockSyntax.prototype.transform = function TransformHasBlockSyntax_transform(ast) {
  let { traverse, builders: b } = this.syntax;

  traverse(ast, {
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
  });

  return ast;
};
