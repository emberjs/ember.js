/**
 @module ember
 @submodule ember-glimmer
*/

/**
  A Glimmer2 AST transformation that replaces all instances of

  ```handlebars
 <button {{action 'foo'}}>
  ```

  with

  ```handlebars
 <button {{action this 'foo'}}>
  ```

  @private
  @class TransformActionSyntax
*/

export default function TransformActionSyntax() {
  // set later within Glimmer2 to the syntax package
  this.syntax = null;
}

const TRANSFORMATIONS = {
  action: 'action'
};

/**
  @private
  @method transform
  @param {AST} ast The AST to be transformed.
*/
TransformActionSyntax.prototype.transform = function TransformActionSyntax_transform(ast) {
  let { traverse, builders: b } = this.syntax;

  traverse(ast, {
    ElementModifierStatement(node) {
      if (TRANSFORMATIONS[node.path.original]) {
        let thisPath = b.path('this');

        // We have to delete the `parts` here because otherwise it will be treated
        // as a property look up (i.e. `this.this`) and will result in `undefined`.
        thisPath.parts = [];

        return b.elementModifier(node.path, [thisPath, ...node.params], node.hash, node.loc);
      }
    }
  });

  return ast;
};
