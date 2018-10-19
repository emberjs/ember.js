import { assert } from '@ember/debug';
import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';
import calculateLocationDisplay from '../system/calculate-location-display';

export default function assertLocalVariableShadowingHelperInvocation(
  env: ASTPluginEnvironment
): ASTPlugin {
  let { moduleName } = env.meta;
  let locals: string[][] = [];

  return {
    name: 'assert-local-variable-shadowing-helper-invocation',

    visitor: {
      BlockStatement: {
        enter(node: AST.BlockStatement) {
          locals.push(node.program.blockParams);
        },

        exit() {
          locals.pop();
        },
      },

      ElementNode: {
        enter(node: AST.ElementNode) {
          locals.push(node.blockParams);
        },

        exit() {
          locals.pop();
        },
      },

      SubExpression(node: AST.SubExpression) {
        assert(
          `${messageFor(node)} ${calculateLocationDisplay(moduleName, node.loc)}`,
          !isLocalVariable(node.path, locals)
        );
      },
    },
  };
}

function isLocalVariable(node: AST.PathExpression, locals: string[][]): boolean {
  return !node.this && hasLocalVariable(node.parts[0], locals);
}

function hasLocalVariable(name: string, locals: string[][]): boolean {
  return locals.some(names => names.indexOf(name) !== -1);
}

function messageFor(node: AST.SubExpression): string {
  let name = node.path.parts[0];
  return `Cannot invoke the \`${name}\` helper because it was shadowed by a local variable (i.e. a block param) with the same name. Please rename the local variable to resolve the conflict.`;
}
