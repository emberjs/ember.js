function TransformComponentAttrsIntoMut() {
  // set later within HTMLBars to the syntax package
  this.syntax = null;
}

/**
  @private
  @method transform
  @param {AST} The AST to be transformed.
*/
TransformComponentAttrsIntoMut.prototype.transform = function TransformBindAttrToAttributes_transform(ast) {
  var b = this.syntax.builders;
  var walker = new this.syntax.Walker();

  walker.visit(ast, function(node) {
    if (!validate(node)) { return; }

    each(node.hash.pairs, function(pair) {
      let { value } = pair;

      if (value.type === 'PathExpression') {
        pair.value = b.sexpr(b.path('@mut'), [pair.value]);
      }
    });
  });

  return ast;
};

function validate(node) {
  return node.type === 'BlockStatement' || node.type === 'MustacheStatement';
}

function each(list, callback) {
  for (var i=0, l=list.length; i<l; i++) {
    callback(list[i]);
  }
}

export default TransformComponentAttrsIntoMut;
