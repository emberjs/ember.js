import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';
import { Builders } from '../types';

function buildProgram(b: Builders, content: AST.Node, escaped: boolean, loc: AST.SourceLocation) {
  return b.program([buildStatement(b, content, escaped, loc)], undefined, loc);
}

function buildStatement(b: Builders, content: AST.Node, escaped: boolean, loc: AST.SourceLocation) {
  switch (content.type) {
    case 'PathExpression':
      return b.mustache(content, undefined, undefined, !escaped, loc);

    case 'SubExpression':
      return b.mustache(content.path, content.params, content.hash, !escaped, loc);

    // The default case handles literals.
    default:
      return b.text(`${(content as AST.Literal).value}`, loc);
  }
}

export default function transformLinkTo(env: ASTPluginEnvironment): ASTPlugin {
  let { builders: b } = env.syntax;

  return {
    name: 'transform-link-to',

    visitor: {
      MustacheStatement(node: AST.MustacheStatement): AST.Node | void {
        if (node.path.original === 'link-to') {
          return b.block(
            'link-to',
            node.params.slice(1),
            node.hash,
            buildProgram(b, node.params[0], node.escaped, node.loc),
            null,
            node.loc
          );
        }
      },
    },
  };
}
