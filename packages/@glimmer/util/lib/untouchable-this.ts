import { HAS_NATIVE_PROXY } from './platform-utils';

export default function buildUntouchableThis(source: string): null | object {
  let context: null | object = null;
  if (import.meta.env.DEV && HAS_NATIVE_PROXY) {
    let assertOnProperty = (property: string | number | symbol) => {
      throw new Error(
        `You accessed \`this.${String(
          property
        )}\` from a function passed to the ${source}, but the function itself was not bound to a valid \`this\` context. Consider updating to use a bound function (for instance, use an arrow function, \`() => {}\`).`
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
