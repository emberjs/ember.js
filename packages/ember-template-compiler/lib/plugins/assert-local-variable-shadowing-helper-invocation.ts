import { StaticTemplateMeta } from '@ember/-internals/views';
import { assert } from '@ember/debug';
import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';
import calculateLocationDisplay from '../system/calculate-location-display';
import { isPath } from './utils';

export default function assertLocalVariableShadowingHelperInvocation(
  env: ASTPluginEnvironment
): ASTPlugin {
  let { moduleName } = env.meta as StaticTemplateMeta;
  let locals: string[][] = [];

  return {
    name: 'assert-local-variable-shadowing-helper-invocation',

    visitor: {
      Program: {
        enter(node: AST.Program) {
          locals.push(node.blockParams);
        },

        exit() {
          locals.pop();
        },
      },

      ElementNode: {
        keys: {
          children: {
            enter(node: AST.ElementNode) {
              locals.push(node.blockParams);
            },

            exit() {
              locals.pop();
            },
          },
        },
      },

      MustacheStatement(node: AST.MustacheStatement) {
        if (isPath(node.path) && hasArguments(node)) {
          let name = node.path.parts[0];
          let type = 'helper';

          assert(
            `${messageFor(name, type)} ${calculateLocationDisplay(moduleName, node.loc)}`,
            !isLocalVariable(node.path, locals)
          );
        }
      },

      SubExpression(node: AST.SubExpression) {
        if (isPath(node.path)) {
          let name = node.path.parts[0];
          let type = 'helper';

          assert(
            `${messageFor(name, type)} ${calculateLocationDisplay(moduleName, node.loc)}`,
            !isLocalVariable(node.path, locals)
          );
        }
      },

      ElementModifierStatement(node: AST.ElementModifierStatement) {
        if (isPath(node.path)) {
          let name = node.path.parts[0];
          let type = 'modifier';

          assert(
            `${messageFor(name, type)} ${calculateLocationDisplay(moduleName, node.loc)}`,
            !isLocalVariable(node.path, locals)
          );
        }
      },
    },
  };
}

function isLocalVariable(node: AST.PathExpression, locals: string[][]): boolean {
  return !node.this && node.parts.length === 1 && hasLocalVariable(node.parts[0], locals);
}

function hasLocalVariable(name: string, locals: string[][]): boolean {
  return locals.some(names => names.indexOf(name) !== -1);
}

function messageFor(name: string, type: string): string {
  return `Cannot invoke the \`${name}\` ${type} because it was shadowed by a local variable (i.e. a block param) with the same name. Please rename the local variable to resolve the conflict.`;
}

function hasArguments(node: AST.MustacheStatement): boolean {
  return node.params.length > 0 || node.hash.pairs.length > 0;
}
