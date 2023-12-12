import { assert } from '@ember/debug';
import type { ASTPlugin } from '@glimmer/syntax';
import calculateLocationDisplay from '../system/calculate-location-display';
import type { EmberASTPluginEnvironment } from '../types';

export default function assertSplattributeExpressions(env: EmberASTPluginEnvironment): ASTPlugin {
  let moduleName = env.meta?.moduleName;

  return {
    name: 'assert-splattribute-expressions',

    visitor: {
      PathExpression({ original, loc }) {
        if (original === '...attributes') {
          assert(`${errorMessage()} ${calculateLocationDisplay(moduleName, loc)}`);
        }
      },
    },
  };
}

function errorMessage() {
  return '`...attributes` can only be used in the element position e.g. `<div ...attributes />`. It cannot be used as a path.';
}
