import { assert } from '@ember/debug';
import { AST, ASTPlugin } from '@glimmer/syntax';
import calculateLocationDisplay from '../system/calculate-location-display';
import { EmberASTPluginEnvironment } from '../types';
import { isPath } from './utils';

export default function errorOnInputWithContent(env: EmberASTPluginEnvironment): ASTPlugin {
  let { moduleName } = env.meta;

  return {
    name: 'assert-input-helper-without-block',

    visitor: {
      BlockStatement(node: AST.BlockStatement) {
        if (isPath(node.path) && node.path.original === 'input') {
          assert(assertMessage(moduleName, node));
        }
      },
    },
  };
}

function assertMessage(moduleName: string, node: AST.BlockStatement): string {
  let sourceInformation = calculateLocationDisplay(moduleName, node.loc);

  return `The {{input}} helper cannot be used in block form. ${sourceInformation}`;
}
