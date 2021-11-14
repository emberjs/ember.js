// NOTE: copied from: https://github.com/glimmerjs/glimmer.js/pull/358
// Both glimmerjs/glimmer.js and emberjs/ember.js have the exact same implementation
// of @cached, so any changes made to one should also be made to the other
import { EMBER_CACHED } from '@ember/canary-features';
import { DEBUG } from '@glimmer/env';
import { createCache, getValue } from '@glimmer/validator';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const cached: PropertyDecorator = (...args: any[]) => {
  if (EMBER_CACHED) {
    const [target, key, descriptor] = args;

    // Error on `@cached()`, `@cached(...args)`, and `@cached propName = value;`
    if (DEBUG && target === undefined) throwCachedExtraneousParens();
    if (
      DEBUG &&
      (typeof target !== 'object' ||
        typeof key !== 'string' ||
        typeof descriptor !== 'object' ||
        args.length !== 3)
    ) {
      throwCachedInvalidArgsError(args);
    }
    if (DEBUG && (!('get' in descriptor) || typeof descriptor.get !== 'function')) {
      throwCachedGetterOnlyError(key);
    }

    const caches = new WeakMap();
    const getter = descriptor.get;

    descriptor.get = function (): unknown {
      if (!caches.has(this)) {
        caches.set(this, createCache(getter.bind(this)));
      }

      return getValue(caches.get(this));
    };
  }
};

function throwCachedExtraneousParens(): never {
  throw new Error(
    'You attempted to use @cached(), which is not necessary nor supported. Remove the parentheses and you will be good to go!'
  );
}

function throwCachedGetterOnlyError(key: string): never {
  throw new Error(`The @cached decorator must be applied to getters. '${key}' is not a getter.`);
}

function throwCachedInvalidArgsError(args: unknown[] = []): never {
  throw new Error(
    `You attempted to use @cached on with ${
      args.length > 1 ? 'arguments' : 'an argument'
    } ( @cached(${args
      .map((d) => `'${d}'`)
      .join(
        ', '
      )}), which is not supported. Dependencies are automatically tracked, so you can just use ${'`@cached`'}`
  );
}
