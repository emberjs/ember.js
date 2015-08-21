export default function TransformUnescapedInlineLinkTo(options) {
  this.options = options;
  this.syntax = null;
}

TransformUnescapedInlineLinkTo.prototype.transform = function TransformUnescapedInlineLinkTo_transform(ast) {
  var b = this.syntax.builders;
  var walker = new this.syntax.Walker();

  walker.visit(ast, function(node) {
    if (!validate(node)) { return; }

    node.escaped = true;
    node.params[0] = b.sexpr(
      b.string('-html-safe'),
      [node.params[0]]
    );
  });

  return ast;
};

function validate(node) {
  return (
    node.type === 'MustacheStatement' &&
    node.path.original === 'link-to' &&
    !node.escaped
  );
}
