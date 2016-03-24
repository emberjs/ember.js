function TransformClosureComponentAttrsIntoMut() {
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
  let walker = new this.syntax.Walker();

  walker.visit(ast, function(node) {
    if (validate(node)) {
      processExpression(b, node);
    }
  });

  return ast;
};

function processExpression(builder, node) {
  processSubExpressionsInNode(builder, node);

  if (isComponentClosure(node)) {
    mutParameters(builder, node);
  }
}

function processSubExpressionsInNode(builder, node) {
  for (let i = 0; i < node.params.length; i++) {
    if (node.params[i].type === 'SubExpression') {
      processExpression(builder, node.params[i]);
    }
  }

  each(node.hash.pairs, function(pair) {
    let { value } = pair;

    if (value.type === 'SubExpression') {
      processExpression(builder, value);
    }
  });
}

function isComponentClosure(node) {
  return node.type === 'SubExpression' && node.path.original === 'component';
}

function mutParameters(builder, node) {
  for (let i = 1; i < node.params.length; i++) {
    if (node.params[i].type === 'PathExpression') {
      node.params[i] = builder.sexpr(builder.path('@mut'), [node.params[i]]);
    }
  }

  each(node.hash.pairs, function(pair) {
    let { value } = pair;

    if (value.type === 'PathExpression') {
      pair.value = builder.sexpr(builder.path('@mut'), [pair.value]);
    }
  });
}

function validate(node) {
  return node.type === 'BlockStatement' || node.type === 'MustacheStatement';
}

function each(list, callback) {
  for (var i = 0, l = list.length; i < l; i++) {
    callback(list[i]);
  }
}

export default TransformClosureComponentAttrsIntoMut;
