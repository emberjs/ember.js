import { EMBER_GLIMMER_ANGLE_BRACKET_INVOCATION } from '@ember/canary-features';
import { assert } from '@ember/debug';
import { ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';
import calculateLocationDisplay from '../system/calculate-location-display';

export default function assertSplattributeExpressions(env: ASTPluginEnvironment): ASTPlugin {
  let { moduleName } = env.meta;

  return {
    name: 'assert-splattribute-expressions',

    visitor: {
      AttrNode({ name, loc }) {
        if (!EMBER_GLIMMER_ANGLE_BRACKET_INVOCATION && name === '...attributes') {
          assert(`${errorMessage()} ${calculateLocationDisplay(moduleName, loc)}`);
        }
      },

      PathExpression({ original, loc }) {
        if (original === '...attributes') {
          assert(`${errorMessage()} ${calculateLocationDisplay(moduleName, loc)}`);
        }
      },
    },
  };
}

function errorMessage() {
  if (EMBER_GLIMMER_ANGLE_BRACKET_INVOCATION) {
    return `Using "...attributes" can only be used in the element position e.g. <div ...attributes />. It cannot be used as a path.`;
  }

  return `...attributes is an invalid path`;
}
