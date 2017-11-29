import { assert } from 'ember-debug';
import calculateLocationDisplay from '../system/calculate-location-display';

export default function assertReservedNamedArguments(env) {
  let { moduleName } = env.meta;

  return {
    name: 'assert-reserved-named-arguments',

    visitor: {
      PathExpression(node) {
        if (node.original[0] === '@') {
          assert(assertMessage(moduleName, node));
        }
      }
    }
  };
}

function assertMessage(moduleName, node) {
  let path = node.original;
  let source = calculateLocationDisplay(moduleName, node.loc);

  return `'${path}' is not a valid path. ${source}`;
}
