function TransformComponentCurlyToReadonly() {
  // set later within HTMLBars to the syntax package
  this.syntax = null;
}

/**
  @private
  @method transform
  @param {AST} The AST to be transformed.
*/
TransformComponentCurlyToReadonly.prototype.transform = function TransformComponetnCurlyToReadonly_transform(ast) {
  var b = this.syntax.builders;
  var walker = new this.syntax.Walker();

  walker.visit(ast, function(node) {
    if (!validate(node)) { return; }

    each(node.attributes, function(attr) {
      if (attr.value.type !== 'MustacheStatement') { return; }
      if (attr.value.params.length || attr.value.hash.pairs.length) { return; }

      attr.value = b.mustache(b.path('readonly'), [attr.value.path], null, !attr.value.escape);
    });
  });

  return ast;
};

function validate(node) {
  return node.type === 'ComponentNode';
}

function each(list, callback) {
  for (var i=0, l=list.length; i<l; i++) {
    callback(list[i]);
  }
}

export default TransformComponentCurlyToReadonly;
