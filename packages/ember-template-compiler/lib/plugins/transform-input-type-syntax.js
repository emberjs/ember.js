/**
 @module ember
 @submodule ember-glimmer
*/

/**
  A Glimmer2 AST transformation that replaces all instances of

  ```handlebars
 {{input type=boundType}}
  ```

  with

  ```handlebars
 {{input (-input-type boundType) type=boundType}}
  ```

  Note that the type parameters is not removed as the -input-type helpers
  is only used to select the component class. The component still needs
  the type parameter to function.

  @private
  @class TransformInputTypeSyntax
*/

export default function TransformInputTypeSyntax() {
  // set later within Glimmer2 to the syntax package
  this.syntax = null;
}

/**
  @private
  @method transform
  @param {AST} ast The AST to be transformed.
*/
TransformInputTypeSyntax.prototype.transform = function TransformInputTypeSyntax_transform(ast) {
  let { traverse, builders: b } = this.syntax;

  traverse(ast, {
    MustacheStatement(node) {
      if (isInput(node)) {
        insertTypeHelperParameter(node, b);
      }
    }
  });

  return ast;
};

function isInput(node) {
  return node.path.original === 'input';
}

function insertTypeHelperParameter(node, builders) {
  let pairs = node.hash.pairs;
  let pair = null;
  for (let i = 0; i < pairs.length; i++) {
    if (pairs[i].key === 'type') {
      pair = pairs[i];
      break;
    }
  }
  if (pair && pair.value.type !== 'StringLiteral') {
    node.params.unshift(builders.sexpr('-input-type', [pair.value], null, pair.loc));
  }
}
