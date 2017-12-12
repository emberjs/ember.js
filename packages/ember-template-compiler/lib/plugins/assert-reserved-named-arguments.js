import { assert } from 'ember-debug';
import { EMBER_GLIMMER_NAMED_ARGUMENTS } from 'ember/features';
import calculateLocationDisplay from '../system/calculate-location-display';

const RESERVED = ['@arguments', '@args'];

let isReserved, assertMessage;

export default function assertReservedNamedArguments(env) {
  let { moduleName } = env.meta;

  return {
    name: 'assert-reserved-named-arguments',

    visitors: {
      PathExpression({ original, loc }) {
        if (isReserved(original)) {
          assert(`${assertMessage(original)} ${calculateLocationDisplay(moduleName, loc)}`);
        }
      }
    }
  };
}

if (EMBER_GLIMMER_NAMED_ARGUMENTS) {
  isReserved = name => RESERVED.indexOf(name) !== -1 || name.match(/^@[^a-z]/);
  assertMessage = name => `'${name}' is reserved.`;
} else {
  isReserved = name => name[0] === '@';
  assertMessage = name => `'${name}' is not a valid path.`;
}
