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

const OLD_HAS_BLOCK = 'hasBlock';
const NEW_HAS_BLOCK = 'has-block';

/**
  @private
  @method transform
  @param {AST} ast The AST to be transformed.
*/
TransformHasBlockSyntax.prototype.transform = function TransformHasBlockSyntax_transform(ast) {
  let { traverse, builders: b } = this.syntax;

  traverse(ast, {
    PathExpression(node) {
      if (node.original === OLD_HAS_BLOCK) {
        return b.sexpr(b.path(NEW_HAS_BLOCK));
      }
    },
    MustacheStatement(node) {
      if (node.path.original === OLD_HAS_BLOCK) {
        return b.mustache(b.path(NEW_HAS_BLOCK), node.params, node.hash, null, node.loc);
      }
    },
    SubExpression(node) {
      if (node.path.original === OLD_HAS_BLOCK) {
        return b.sexpr(b.path(NEW_HAS_BLOCK), node.params, node.hash);
      }
    }
  });

  return ast;
};
