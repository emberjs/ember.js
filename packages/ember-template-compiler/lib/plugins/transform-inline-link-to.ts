import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';
import { Builders } from '../types';

function buildProgram(b: Builders, content: AST.Node, loc: AST.SourceLocation) {
  return b.program([buildStatement(b, content, loc)], undefined, loc);
}

function buildStatement(b: Builders, content: AST.Node, loc: AST.SourceLocation) {
  switch (content.type) {
    case 'PathExpression':
      return b.mustache(content, undefined, undefined, undefined, loc);

    case 'SubExpression':
      return b.mustache(content.path, content.params, content.hash, undefined, loc);

    // The default case handles literals.
    default:
      return b.text(`${(content as AST.Literal).value}`, loc);
  }
}

function unsafeHtml(b: Builders, expr: AST.Expression) {
  return b.sexpr('-html-safe', [expr]);
}

export default function transformInlineLinkTo(env: ASTPluginEnvironment): ASTPlugin {
  let { builders: b } = env.syntax;

  return {
    name: 'transform-inline-link-to',

    visitor: {
      MustacheStatement(node: AST.MustacheStatement): AST.Node | void {
        if (node.path.original === 'link-to') {
          let content = node.escaped ? node.params[0] : unsafeHtml(b, node.params[0]);
          return b.block(
            'link-to',
            node.params.slice(1),
            node.hash,
            buildProgram(b, content, node.loc),
            null,
            node.loc
          );
        }
      },
    },
  };
}
