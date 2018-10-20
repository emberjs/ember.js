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

      ElementModifierStatement(node: AST.ElementModifierStatement) {
        // The ElementNode get visited first, but modifiers are more of a sibling
        // than a child in the lexical scope (we aren't evaluated in its "block")
        // so any locals introduced by the last element doesn't count
        assert(
          `${messageFor(node)} ${calculateLocationDisplay(moduleName, node.loc)}`,
          !isLocalVariable(node.path, locals.slice(0, -1))
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

function messageFor(node: AST.SubExpression | AST.ElementModifierStatement): string {
  let type = isSubExpression(node) ? 'helper' : 'modifier';
  let name = node.path.parts[0];
  return `Cannot invoke the \`${name}\` ${type} because it was shadowed by a local variable (i.e. a block param) with the same name. Please rename the local variable to resolve the conflict.`;
}

function isSubExpression(
  node: AST.SubExpression | AST.ElementModifierStatement
): node is AST.SubExpression {
  return node.type === 'SubExpression';
}
