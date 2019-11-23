import { StaticTemplateMeta } from '@ember/-internals/views';
import { assert } from '@ember/debug';
import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';
import calculateLocationDisplay from '../system/calculate-location-display';

export default function assertReservedNamedArguments(env: ASTPluginEnvironment): ASTPlugin {
  let { moduleName } = env.meta as StaticTemplateMeta;

  return {
    name: 'assert-reserved-named-arguments',

    visitor: {
      // In general, we don't assert on the invocation side to avoid creating migration
      // hazards (e.g. using angle bracket to invoke a classic component that uses
      // `this.someReservedName`. However, we want to avoid leaking special internal
      // things, such as `__ARGS__`, so those would need to be asserted on both sides.

      AttrNode({ name, loc }: AST.AttrNode) {
        if (name === '@__ARGS__') {
          assert(`${assertMessage(name)} ${calculateLocationDisplay(moduleName, loc)}`);
        }
      },

      HashPair({ key, loc }: AST.HashPair) {
        if (key === '__ARGS__') {
          assert(`${assertMessage(key)} ${calculateLocationDisplay(moduleName, loc)}`);
        }
      },

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
