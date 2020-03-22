import { StaticTemplateMeta } from '@ember/-internals/views';
import { assert } from '@ember/debug';
import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';
import calculateLocationDisplay from '../system/calculate-location-display';

/**
 @module ember
*/

/**
  Prevents usage of named blocks

  @private
  @class AssertAgainstNamedBlocks
*/
export default function assertAgainstNamedBlocks(env: ASTPluginEnvironment): ASTPlugin {
  let { moduleName } = env.meta as StaticTemplateMeta;

  return {
    name: 'assert-against-named-blocks',

    visitor: {
      ElementNode(node: AST.ElementNode) {
        if (node.tag[0] === ':') {
          let sourceInformation = calculateLocationDisplay(moduleName, node.loc);

          assert(
            `Named blocks are not currently available, attempted to use the <${node.tag}> named block. ${sourceInformation}`
          );
        }
      },

      MustacheStatement(node: AST.MustacheStatement) {
        if (node.path.type === 'PathExpression' && node.path.original === 'yield') {
          let to = node.hash.pairs.filter(pair => pair.key === 'to')[0];

          // Glimmer template compiler ensures yield must receive a string literal,
          // so we only need to check if it is not "default" or "inverse"
          if (
            to &&
            to.value.type === 'StringLiteral' &&
            to.value.original !== 'default' &&
            to.value.original !== 'inverse'
          ) {
            let sourceInformation = calculateLocationDisplay(moduleName, node.loc);

            assert(
              `Named blocks are not currently available, attempted to yield to a named block other than "default" or "inverse": {{yield to="${to.value.original}"}}. ${sourceInformation}`
            );
          }
        }
      },
    },
  };
}
