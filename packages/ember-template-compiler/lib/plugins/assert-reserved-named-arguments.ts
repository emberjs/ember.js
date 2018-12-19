import { EMBER_GLIMMER_NAMED_ARGUMENTS } from '@ember/canary-features';
import { assert } from '@ember/debug';
import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';
import calculateLocationDisplay from '../system/calculate-location-display';

const RESERVED = ['@arguments', '@args', '@block', '@else'];

let isReserved: (name: string) => boolean, assertMessage: (name: string) => void;

export default function assertReservedNamedArguments(env: ASTPluginEnvironment): ASTPlugin {
  let { moduleName } = env.meta;

  return {
    name: 'assert-reserved-named-arguments',

    visitor: {
      PathExpression({ original, loc }: AST.PathExpression) {
        if (isReserved(original)) {
          assert(`${assertMessage(original)} ${calculateLocationDisplay(moduleName, loc)}`);
        }
      },
    },
  };
}

if (EMBER_GLIMMER_NAMED_ARGUMENTS) {
  isReserved = name => RESERVED.indexOf(name) !== -1 || Boolean(name.match(/^@[^a-z]/));
  assertMessage = name => `'${name}' is reserved.`;
} else {
  isReserved = name => name[0] === '@';
  assertMessage = name => `'${name}' is not a valid path.`;
}
