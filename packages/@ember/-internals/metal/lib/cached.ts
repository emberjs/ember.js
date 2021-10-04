// NOTE: copied from: https://github.com/glimmerjs/glimmer.js/pull/358
// Both glimmerjs/glimmer.js and emberjs/ember.js have the exact same implementation
// of @cached, so any changes made to one should also be made to the other
import { DEBUG } from '@glimmer/env';
import { createCache, getValue } from '@glimmer/validator';
import { EMBER_CACHED } from '@ember/canary-features';

/**
 * @decorator
 *
 * The `@cached` decorator can be used on getters in order to cache the return
 * value of the getter. This is useful when a getter is expensive and used very
 * often.
 *
 *
 * @example
 *
 * in this guest list class, we have the `sortedGuests`
 * getter that sorts the guests alphabetically:
 *
 * ```js
 * import { tracked } from '@glimmer/tracking';
 *
 * class GuestList {
 *   @tracked guests = ['Zoey', 'Tomster'];
 *
 *   get sortedGuests() {
 *     return this.guests.slice().sort()
 *   }
 * }
 * ```
 *
 * Every time `sortedGuests` is accessed, a new array will be created and sorted,
 * because JavaScript getters do not cache by default. When the guest list is
 * small, like the one in the example, this is not a problem. However, if the guest
 * list were to grow very large, it would mean that we would be doing a large
 * amount of work each time we accessed `sortedGetters`. With `@cached`, we can
 * cache the value instead:
 *
 * ```js
 * import { tracked, cached } from '@glimmer/tracking';
 *
 * class GuestList {
 *   @tracked guests = ['Zoey', 'Tomster'];
 *
 *   @cached
 *   get sortedGuests() {
 *     return this.guests.slice().sort()
 *   }
 * }
 * ```
 *
 * Now the `sortedGuests` getter will be cached based on _autotracking_. It will
 * only rerun and create a new sorted array when the `guests` tracked property is
 * updated.
 *
 * In general, you should avoid using `@cached` unless you have confirmed that the
 * getter you are decorating is computationally expensive. `@cached` adds a small
 * amount of overhead to the getter, making it more expensive. While this overhead
 * is small, if `@cached` is overused it can add up to a large impact overall in
 * your app. Many getters and tracked properties are only accessed once, rendered,
 * and then never rerendered, so adding `@cached` when it is unnecessary can
 * negatively impact performance.
 */
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
