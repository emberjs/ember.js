declare module '@ember/-internals/metal/lib/cache' {
  export { createCache, getValue, isConst } from '@glimmer/validator';
  /**
      Ember uses caching based on trackable values to avoid updating large portions
      of the application. This caching is exposed via a cache primitive that can be
      used to cache a specific computation, so that it will not update and will
      return the cached value until a tracked value used in its computation has
      updated.

      @module @glimmer/tracking/primitives/cache
      @public
    */
  /**
      Receives a function, and returns a wrapped version of it that memoizes based on
      _autotracking_. The function will only rerun whenever any tracked values used
      within it have changed. Otherwise, it will return the previous value.

      ```js
      import { tracked } from '@glimmer/tracking';
      import { createCache, getValue } from '@glimmer/tracking/primitives/cache';

      class State {
        @tracked value;
      }

      let state = new State();
      let computeCount = 0;

      let counter = createCache(() => {
        // consume the state. Now, `counter` will
        // only rerun if `state.value` changes.
        state.value;

        return ++computeCount;
      });

      getValue(counter); // 1

      // returns the same value because no tracked state has changed
      getValue(counter); // 1

      state.value = 'foo';

      // reruns because a tracked value used in the function has changed,
      // incermenting the counter
      getValue(counter); // 2
      ```

      @method createCache
      @static
      @for @glimmer/tracking/primitives/cache
      @public
    */
  /**
      Gets the value of a cache created with `createCache`.

      ```js
      import { tracked } from '@glimmer/tracking';
      import { createCache, getValue } from '@glimmer/tracking/primitives/cache';

      let computeCount = 0;

      let counter = createCache(() => {
        return ++computeCount;
      });

      getValue(counter); // 1
      ```

      @method getValue
      @static
      @for @glimmer/tracking/primitives/cache
      @public
    */
  /**
      Can be used to check if a memoized function is _constant_. If no tracked state
      was used while running a memoized function, it will never rerun, because nothing
      can invalidate its result. `isConst` can be used to determine if a memoized
      function is constant or not, in order to optimize code surrounding that
      function.

      ```js
      import { tracked } from '@glimmer/tracking';
      import { createCache, getValue, isConst } from '@glimmer/tracking/primitives/cache';

      class State {
        @tracked value;
      }

      let state = new State();
      let computeCount = 0;

      let counter = createCache(() => {
        // consume the state
        state.value;

        return computeCount++;
      });

      let constCounter = createCache(() => {
        return computeCount++;
      });

      getValue(counter);
      getValue(constCounter);

      isConst(counter); // false
      isConst(constCounter); // true
      ```

      If called on a cache that hasn't been accessed yet, it will throw an
      error. This is because there's no way to know if the function will be constant
      or not yet, and so this helps prevent missing an optimization opportunity on
      accident.

      @method isConst
      @static
      @for @glimmer/tracking/primitives/cache
      @public
    */
}
