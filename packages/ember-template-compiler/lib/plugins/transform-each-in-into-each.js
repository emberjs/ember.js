/**
 @module ember
 @submodule ember-glimmer
*/

/**
  A Glimmer2 AST transformation that replaces all instances of

  ```handlebars
 {{#each-in iterableThing as |key value|}}
  ```

  with

  ```handlebars
 {{#each (-each-in iterableThing) as |key value|}}
  ```

  @private
  @class TransformHasBlockSyntax
*/

export default function TransformEachInIntoEach() {
  // set later within Glimmer2 to the syntax package
  this.syntax = null;
}

/**
  @private
  @method transform
  @param {AST} ast The AST to be transformed.
*/
TransformEachInIntoEach.prototype.transform = function TransformEachInIntoEach_transform(ast) {
  let { traverse, builders: b } = this.syntax;

  traverse(ast, {
    BlockStatement(node) {
      if (node.path.original === 'each-in') {
        node.params[0] = b.sexpr(b.path('-each-in'), [node.params[0]]);
        return b.block(b.path('each'), node.params, node.hash, node.program, node.inverse, node.loc);
      }
    }
  });

  return ast;
};
