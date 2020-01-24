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
          assert(assertMessage(node.tag, moduleName, node));
        }
      },
    },
  };
}

function assertMessage(tagName: string, moduleName: string, node: AST.ElementNode) {
  let sourceInformation = calculateLocationDisplay(moduleName, node.loc);

  return `Named blocks are not currently available, attempted to use the {{${tagName}}} named block. ${sourceInformation}`;
}
