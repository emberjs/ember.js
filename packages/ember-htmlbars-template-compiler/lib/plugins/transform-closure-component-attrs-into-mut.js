export default function TransformClosureComponentAttrsIntoMut() {
  // set later within HTMLBars to the syntax package
  this.syntax = null;
}

/**
  @private
  @method transform
  @param {AST} ast The AST to be transformed.
*/
TransformClosureComponentAttrsIntoMut.prototype.transform = function TransformClosureComponentAttrsIntoMut_transform(ast) {
  let b = this.syntax.builders;

  this.syntax.traverse(ast, {
    SubExpression(node) {
      if (isComponentClosure(node)) {
        mutParameters(b, node);
      }
    }
  });

  return ast;
};

function isComponentClosure(node) {
  return node.type === 'SubExpression' && node.path.original === 'component';
}

function mutParameters(builder, node) {
  for (let i = 1; i < node.params.length; i++) {
    if (node.params[i].type === 'PathExpression') {
      node.params[i] = builder.sexpr(builder.path('@mut'), [node.params[i]]);
    }
  }

  for (let i = 0;  i < node.hash.pairs.length; i++) {
    let pair = node.hash.pairs[i];
    let { value } = pair;

    if (value.type === 'PathExpression') {
      pair.value = builder.sexpr(builder.path('@mut'), [pair.value]);
    }
  }
}
