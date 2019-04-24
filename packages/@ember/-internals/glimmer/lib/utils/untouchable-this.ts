import { HAS_NATIVE_PROXY } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

export default function buildUntouchableThis(source: string): null | object {
  let context: null | object = null;
  if (DEBUG && HAS_NATIVE_PROXY) {
    let assertOnProperty = (property: string | number | symbol) => {
      assert(
        `You accessed \`this.${String(
          property
        )}\` from a function passed to the ${source}, but the function itself was not bound to a valid \`this\` context. Consider updating to usage of \`@action\`.`
      );
    };

    context = new Proxy(
      {},
      {
        get(_target: {}, property: string | symbol) {
          assertOnProperty(property);
        },

        set(_target: {}, property: string | symbol) {
          assertOnProperty(property);

          return false;
        },

        has(_target: {}, property: string | symbol) {
          assertOnProperty(property);

          return false;
        },
      }
    );
  }

  return context;
}
