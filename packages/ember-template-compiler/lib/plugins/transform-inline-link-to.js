export default function TransformInlineLinkTo(options) {
  this.options = options;
  this.syntax = null;
}

TransformInlineLinkTo.prototype.transform = function TransformInlineLinkTo_transform(ast) {
  let { traverse, builders: b } = this.syntax;

  function buildProgram(content, loc) {
    return b.program([buildStatement(content, loc)], null, loc);
  }

  function buildStatement(content, loc) {
    switch (content.type) {
      case 'PathExpression':
        return b.mustache(content, null, null, null, loc);

      case 'SubExpression':
        return b.mustache(content.path, content.params, content.hash, null, loc);

      // The default case handles literals.
      default:
        return b.text(`${content.value}`, loc);
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
          buildProgram(content, node.loc),
          null,
          node.loc
        );
      }
    }
  });

  return ast;
};
