declare module '@ember/-internals/metal/lib/cached' {
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

      @method cached
      @static
      @for @glimmer/tracking
      @public
     */
  export const cached: PropertyDecorator;
}
