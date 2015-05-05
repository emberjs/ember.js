export default function TransformSingleArgEach() {
  this.syntax = null;
}

TransformSingleArgEach.prototype.transform = function TransformSingleArgEach_transform(ast) {
  var b = this.syntax.builders;
  var walker = new this.syntax.Walker();

  walker.visit(ast, function(node) {
    if (!validate(node)) { return; }

    node.params.push(b.path('this'));
  });

  return ast;
};

function validate(node) {
  return (node.type === 'BlockStatement' || node.type === 'MustacheStatement') &&
    node.path.original === 'each' &&
    node.params.length === 0;
}
