import { assert } from '@ember/debug';
import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';
import calculateLocationDisplay from '../system/calculate-location-display';

export default function errorOnInputWithContent(env: ASTPluginEnvironment): ASTPlugin {
  let { moduleName } = env.meta;

  return {
    name: 'assert-input-helper-without-block',

    visitor: {
      BlockStatement(node: AST.BlockStatement) {
        if (node.path.original !== 'input') {
          return;
        }

        assert(assertMessage(moduleName, node));
      },
    },
  };
}

function assertMessage(moduleName: string, node: AST.BlockStatement): string {
  let sourceInformation = calculateLocationDisplay(moduleName, node.loc);

  return `The {{input}} helper cannot be used in block form. ${sourceInformation}`;
}
