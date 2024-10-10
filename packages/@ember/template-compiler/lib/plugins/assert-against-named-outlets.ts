import { assert } from '@ember/debug';
import type { AST, ASTPlugin } from '@glimmer/syntax';
import calculateLocationDisplay from '../system/calculate-location-display';
import type { EmberASTPluginEnvironment } from '../types';

/**
 @module ember
*/

/**
  Prevents usage of named outlets, a legacy concept in Ember removed in 4.0.

  @private
  @class AssertAgainstNamedOutlets
*/
export default function assertAgainstNamedOutlets(env: EmberASTPluginEnvironment): ASTPlugin {
  let moduleName = env.meta?.moduleName;

  return {
    name: 'assert-against-named-outlets',

    visitor: {
      MustacheStatement(node: AST.MustacheStatement) {
        if (
          node.path.type === 'PathExpression' &&
          node.path.original === 'outlet' &&
          node.params[0]
        ) {
          let sourceInformation = calculateLocationDisplay(moduleName, node.loc);
          assert(
            `Named outlets were removed in Ember 4.0. See https://deprecations.emberjs.com/v3.x#toc_route-render-template for guidance on alternative APIs for named outlet use cases. ${sourceInformation}`
          );
        }
      },
    },
  };
}
