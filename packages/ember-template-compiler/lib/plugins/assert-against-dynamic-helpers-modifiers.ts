import { assert } from '@ember/debug';
import { AST, ASTPlugin } from '@glimmer/syntax';
import calculateLocationDisplay from '../system/calculate-location-display';
import { EmberASTPluginEnvironment } from '../types';
import { isPath, trackLocals } from './utils';

export default function assertAgainstDynamicHelpersModifiers(
  env: EmberASTPluginEnvironment
): ASTPlugin {
  let moduleName = env.meta?.moduleName;
  let { hasLocal, node } = trackLocals();

  return {
    name: 'assert-against-dynamic-helpers-modifiers',

    visitor: {
      Program: node,

      ElementNode: {
        keys: {
          children: node,
        },
      },

      MustacheStatement(node: AST.MustacheStatement) {
        if (isPath(node.path)) {
          let name = node.path.parts[0];

          assert(
            `${messageFor(name)} ${calculateLocationDisplay(moduleName, node.loc)}`,
            (name !== 'helper' && name !== 'modifier') || isLocalVariable(node.path, hasLocal)
          );
        }
      },

      SubExpression(node: AST.SubExpression) {
        if (isPath(node.path)) {
          let name = node.path.parts[0];

          assert(
            `${messageFor(name)} ${calculateLocationDisplay(moduleName, node.loc)}`,
            (name !== 'helper' && name !== 'modifier') || isLocalVariable(node.path, hasLocal)
          );
        }
      },
    },
  };
}

function isLocalVariable(node: AST.PathExpression, hasLocal: (k: string) => boolean): boolean {
  return !node.this && node.parts.length === 1 && hasLocal(node.parts[0]);
}

function messageFor(name: string): string {
  return `Cannot use the (${name}) keyword yet, as it has not been implemented.`;
}
