import { assert } from '@ember/debug';
import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';
import calculateLocationDisplay from '../system/calculate-location-display';

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

const RESERVED = ['@arguments', '@args', '@block', '@else'];

function isReserved(name: string): boolean {
  return RESERVED.indexOf(name) !== -1 || Boolean(name.match(/^@[^a-z]/));
}

function assertMessage(name: string): string {
  return `'${name}' is reserved.`;
}
