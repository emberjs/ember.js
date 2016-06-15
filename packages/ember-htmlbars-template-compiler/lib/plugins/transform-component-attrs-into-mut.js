export default function TransformComponentAttrsIntoMut() {
  // set later within HTMLBars to the syntax package
  this.syntax = null;
}

/**
  @private
  @method transform
  @param {AST} ast The AST to be transformed.
*/
TransformComponentAttrsIntoMut.prototype.transform = function TransformComponentAttrsIntoMut_transform(ast) {
  let b = this.syntax.builders;
  let walker = new this.syntax.Walker();

  walker.visit(ast, function(node) {
    if (!validate(node)) { return; }

    for (let i = 0; i < node.hash.pairs.length; i++) {
      let pair = node.hash.pairs[i];
      let { value } = pair;

      if (value.type === 'PathExpression') {
        pair.value = b.sexpr(b.path('@mut'), [pair.value]);
      }
    }
  });

  return ast;
};

function validate(node) {
  return node.type === 'BlockStatement' || node.type === 'MustacheStatement';
}
