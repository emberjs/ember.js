import { assert } from '@ember/debug';
import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';
import calculateLocationDisplay from '../system/calculate-location-display';

export default function assertIfHelperWithoutArguments(env: ASTPluginEnvironment): ASTPlugin {
  let { moduleName } = env.meta;

  return {
    name: 'assert-if-helper-without-arguments',

    visitor: {
      BlockStatement(node: AST.BlockStatement) {
        if (isInvalidBlockIf(node)) {
          assert(
            `${blockAssertMessage(node.path.original)} ${calculateLocationDisplay(
              moduleName,
              node.loc
            )}`
          );
        }
      },

      MustacheStatement(node: AST.MustacheStatement) {
        if (isInvalidInlineIf(node)) {
          assert(
            `${inlineAssertMessage(node.path.original as string)} ${calculateLocationDisplay(
              moduleName,
              node.loc
            )}`
          );
        }
      },

      SubExpression(node: AST.SubExpression) {
        if (isInvalidInlineIf(node)) {
          assert(
            `${inlineAssertMessage(node.path.original)} ${calculateLocationDisplay(
              moduleName,
              node.loc
            )}`
          );
        }
      },
    },
  };
}

function blockAssertMessage(original: string) {
  return `#${original} requires a single argument.`;
}

function inlineAssertMessage(original: string) {
  return `The inline form of the '${original}' helper expects two or three arguments.`;
}

function isInvalidInlineIf(node: AST.BlockStatement | AST.MustacheStatement | AST.SubExpression) {
  return (
    node.path.original === 'if' &&
    (!node.params || node.params.length < 2 || node.params.length > 3)
  );
}

function isInvalidBlockIf(node: AST.BlockStatement | AST.MustacheStatement | AST.SubExpression) {
  return node.path.original === 'if' && (!node.params || node.params.length !== 1);
}
