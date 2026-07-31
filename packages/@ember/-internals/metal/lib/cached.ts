// NOTE: copied from: https://github.com/glimmerjs/glimmer.js/pull/358
// Both glimmerjs/glimmer.js and emberjs/ember.js have the exact same implementation
// of @cached, so any changes made to one should also be made to the other
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { type CachedValue, cachedValue } from '@glimmer/validator/lib/cached-value';
import { createCache, getValue } from '@glimmer/validator/lib/tracking';

/**
 * @decorator
 *
  Gives the getter a caching behavior. The return value of the getter
  will be cached until any of the properties it is entangled with
  are invalidated. This is useful when a getter is expensive and
  used very often.

  For instance, in this `GuestList` class, we have the `sortedGuests`
  getter that sorts the guests alphabetically:

  ```javascript
    import { tracked } from '@glimmer/tracking';

    class GuestList {
      @tracked guests = ['Zoey', 'Tomster'];

      get sortedGuests() {
        return this.guests.slice().sort()
      }
    }
  ```

  Every time `sortedGuests` is accessed, a new array will be created and sorted,
  because JavaScript getters do not cache by default. When the guest list
  is small, like the one in the example, this is not a problem. However, if
  the guest list were to grow very large, it would mean that we would be doing
  a large amount of work each time we accessed `sortedGuests`. With `@cached`,
  we can cache the value instead:

  ```javascript
    import { tracked, cached } from '@glimmer/tracking';

    class GuestList {
      @tracked guests = ['Zoey', 'Tomster'];

      @cached
      get sortedGuests() {
        return this.guests.slice().sort()
      }
    }
  ```

  Now the `sortedGuests` getter will be cached based on autotracking.
  It will only rerun and create a new sorted array when the guests tracked
  property is updated.


  ### Tradeoffs

  Overuse is discouraged.

  In general, you should avoid using `@cached` unless you have confirmed that
  the getter you are decorating is computationally expensive, since `@cached`
  adds a small amount of overhead to the getter.
  While the individual costs are small, a systematic use of the `@cached`
  decorator can add up to a large impact overall in your app.
  Many getters and tracked properties are only accessed once during rendering,
  and then never rerendered, so adding `@cached` when unnecessary can
  negatively impact performance.

  Also, `@cached` may rerun even if the values themselves have not changed,
  since tracked properties will always invalidate.
  For example updating an integer value from `5` to an other `5` will trigger
  a rerun of the cached properties building from this integer.

  Avoiding a cache invalidation in this case is not something that can
  be achieved on the `@cached` decorator itself, but rather when updating
  the underlying tracked values, by applying some diff checking mechanisms:

  ```javascript
  if (nextValue !== this.trackedProp) {
    this.trackedProp = nextValue;
  }
  ```

  Here equal values won't update the property, therefore not triggering
  the subsequent cache invalidations of the `@cached` properties who were
  using this `trackedProp`.

  Remember that setting tracked data should only be done during initialization,
  or as the result of a user action. Setting tracked data during render
  (such as in a getter), is not supported.

  ### Standalone usage

  Calling `cached` with a function creates a standalone cached reactive
  value, usable outside of classes:

  ```js
  import { tracked, cached } from '@glimmer/tracking';

  const count = tracked(0);
  const doubled = cached(() => count.value * 2);

  doubled.value; // read the cached value, entangling with any tracking context
  doubled.get(); // function shorthand for reading
  ```

  The function is only re-invoked when tracked state it previously read has
  changed; reading `value` in a template (or in a getter used by a template)
  will rerender just like a `@cached` getter.

  This form accepts an options object containing a `description` used for
  debugging:

  ```js
  const doubled = cached(() => count.value * 2, { description: 'doubled' });
  ```

  @method cached
  @static
  @for @glimmer/tracking
  @public
 */
/**
 * Options for the standalone `cached(fn, options)` form.
 *
 * - `description` is used in development for debugging.
 */
interface CachedValueOptions {
  description?: string;
}

/**
 * `cached` as a decorator: `@cached get fullName() { … }`.
 */
export function cached<T>(
  target: object,
  key: string | symbol,
  descriptor: TypedPropertyDescriptor<T>
): void;
/**
 * `cached` as a standalone cached reactive value, usable outside of classes:
 * `const doubled = cached(() => count.value * 2)`.
 */
export function cached<Value>(fn: () => Value, options?: CachedValueOptions): CachedValue<Value>;
export function cached(...args: any[]): CachedValue<unknown> | void {
  const [target, key, descriptor] = args;

  // Error on `@cached()`, `@cached(...args)`, and `@cached propName = value;`
  if (DEBUG && target === undefined) throwCachedExtraneousParens();

  if (typeof target === 'function' && args.length <= 2) {
    /*
      Standalone form. Returns a read-only `CachedValue` usable outside of
      classes. A legacy decorator invocation always receives three arguments,
      so it can never land in this branch.

      ```js
      const doubled = cached(() => count.value * 2);

      doubled.value; // read (consumes what the function read)
      doubled.get(); // function shorthand for reading
      ```
    */
    const options = key as CachedValueOptions | undefined;

    assert(
      `cached() may only receive an options object containing 'description' as its second argument, received ${options}`,
      options === undefined || (typeof options === 'object' && options !== null)
    );

    if (DEBUG && options) {
      assert(
        `The 'description' option passed to cached must be a string. Received ${options.description}`,
        !('description' in options) || typeof options.description === 'string'
      );
    }

    return cachedValue(target as () => unknown, options);
  }

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
