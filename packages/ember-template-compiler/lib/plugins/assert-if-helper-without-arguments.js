import { assert } from '@ember/debug';
import calculateLocationDisplay from '../system/calculate-location-display';

export default function assertIfHelperWithoutArguments(env) {
  let { moduleName } = env.meta;

  return {
    name: 'assert-if-helper-without-arguments',

    visitor: {
      BlockStatement(node) {
        if (isInvalidBlockIf(node)) {
          assert(
            `${blockAssertMessage(node.path.original)} ${calculateLocationDisplay(
              moduleName,
              node.loc
            )}`
          );
        }
      },

      MustacheStatement(node) {
        if (isInvalidInlineIf(node)) {
          assert(
            `${inlineAssertMessage(node.path.original)} ${calculateLocationDisplay(
              moduleName,
              node.loc
            )}`
          );
        }
      },

      SubExpression(node) {
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

function blockAssertMessage(original) {
  return `#${original} requires a single argument.`;
}

function inlineAssertMessage(original) {
  return `The inline form of the '${original}' helper expects two or three arguments.`;
}

function isInvalidInlineIf(node) {
  return (
    node.path.original === 'if' &&
    (!node.params || node.params.length < 2 || node.params.length > 3)
  );
}

function isInvalidBlockIf(node) {
  return node.path.original === 'if' && (!node.params || node.params.length !== 1);
}
