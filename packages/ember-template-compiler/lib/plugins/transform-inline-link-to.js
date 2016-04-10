export default function TransformInlineLinkTo(options) {
  this.options = options;
  this.syntax = null;
}

TransformInlineLinkTo.prototype.transform = function TransformInlineLinkTo_transform(ast) {
  let { traverse, builders: b } = this.syntax;

  function buildProgram(content) {
    return b.program([buildStatement(content)]);
  }

  function buildStatement(content) {
    switch (content.type) {
      case 'PathExpression':
        return b.mustache(content);

      case 'SubExpression':
        return b.mustache(content.path, content.params, content.hash);

      // The default case handles literals.
      default:
        return b.text('' + content.value);
    }
  }

  function unsafeHtml(expr) {
    return b.sexpr('-html-safe', [expr]);
  }

  traverse(ast, {
    MustacheStatement(node) {
      if (node.path.original === 'link-to') {
        let content = node.escaped ? node.params[0] : unsafeHtml(node.params[0]);
        return b.block(
          'link-to',
          node.params.slice(1),
          node.hash,
          buildProgram(content)
        );
      }
    }
  });

  return ast;
};
