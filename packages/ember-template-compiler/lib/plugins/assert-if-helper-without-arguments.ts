import { StaticTemplateMeta } from '@ember/-internals/views';
import { assert } from '@ember/debug';
import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';
import calculateLocationDisplay from '../system/calculate-location-display';
import { isPath } from './utils';

export default function assertIfHelperWithoutArguments(env: ASTPluginEnvironment): ASTPlugin {
  let { moduleName } = env.meta as StaticTemplateMeta;

  return {
    name: 'assert-if-helper-without-arguments',

    visitor: {
      BlockStatement(node: AST.BlockStatement) {
        if (isPath(node.path) && isInvalidBlockIf(node.path, node.params)) {
          assert(
            `${blockAssertMessage(node.path.original)} ${calculateLocationDisplay(
              moduleName,
              node.loc
            )}`
          );
        }
      },

      MustacheStatement(node: AST.MustacheStatement) {
        if (isPath(node.path) && isInvalidInlineIf(node.path, node.params)) {
          assert(
            `${inlineAssertMessage(node.path.original as string)} ${calculateLocationDisplay(
              moduleName,
              node.loc
            )}`
          );
        }
      },

      SubExpression(node: AST.SubExpression) {
        if (isPath(node.path) && isInvalidInlineIf(node.path, node.params)) {
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

function isInvalidInlineIf(path: AST.PathExpression, params: AST.Expression[]) {
  return (
    isPath(path) &&
    path.original === 'if' &&
    (!params || params.length < 2 || params.length > 3)
  );
}

function isInvalidBlockIf(path: AST.PathExpression, params: AST.Expression[]) {
  return (
    isPath(path) &&
    path.original === 'if' &&
    (!params || params.length !== 1)
  );
}
