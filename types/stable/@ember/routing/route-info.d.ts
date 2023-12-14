declare module '@ember/routing/route-info' {
  /**
      Re-exports the `RouteInfo` and `RouteInfoWithMetadata` types from [router.js].
      `RouteInfo` and `RouteInfoWithMetadata` appear as properties on `Transition`
      instances.

      [router.js]: https://github.com/tildeio/router.js

      @module @ember/routing/route-info
     */
  /**
      A `RouteInfo` is an object that contains metadata about a specific route
      within a `Transition`. It is read-only and internally immutable. It is also
      not observable, because a `Transition` instance is never changed after
      creation.

      A `RouteInfo` is not user-constructible; the only legal way to get one is from
      a valid `Transition`. However, you can import the type by using `import type`
      syntax with TypeScript or `import()` in JSDoc comments.

      @class RouteInfo
      @public
     */
  /**
      The dot-separated, fully-qualified name of the route, like `"people.index"`.
      @property {String} name
      @public
     */
  /**
      The final segment of the fully-qualified name of the route, like `"index"`
      @property {String} localName
      @public
     */
  /**
      The values of the route's parameters. These are the same params that are
      received as arguments to the route's `model` hook. Contains only the
      parameters valid for this route, if any (params for parent or child routes are
      not merged).
      @property {Object} params
      @public
     */
  /**
      The ordered list of the names of the params required for this route. It will
      contain the same strings as Object.keys(params), but here the order is
      significant. This allows users to correctly pass params into routes
      programmatically.
      @property {Array} paramNames
      @public
     */
  /**
      The values of any queryParams on this route.
      @property {Object} queryParams
      @public
     */
  /**
      Will contain the result `Route#buildRouteInfoMetadata` for the corresponding
      Route.
      @property {Any} metadata
      @public
     */
  /**
      A reference to the parent route's `RouteInfo`. This can be used to traverse
      upward to the topmost `RouteInfo`.
      @property {RouteInfo|null} parent
      @public
     */
  /**
      A reference to the child route's `RouteInfo`. This can be used to traverse
      downward to the leafmost `RouteInfo`.
      @property {RouteInfo|null} child
      @public
     */
  /**
      Allows you to traverse through the linked list of `RouteInfo`s from the
      topmost to leafmost. Returns the first `RouteInfo` in the linked list for
      which the callback returns true.

      This method is similar to the `find()` method defined in ECMAScript 2015.

      The callback method you provide should have the following signature (all
      parameters are optional):

      ```javascript
      function(item, index, array);
      ```

      - `item` is the current item in the iteration.
      - `index` is the current index in the iteration.
      - `array` is the array itself.

      It should return the `true` to include the item in the results, `false`
      otherwise.

      Note that in addition to a callback, you can also pass an optional target
      object that will be set as `this` on the context.

      @method find
      @param {Function} callback the callback to execute
      @param {Object} [target*] optional target to use
      @returns {Object} Found item or undefined
      @public
     */
  /**
      A `RouteInfoWithAttributes` is an object that contains metadata, including the
      resolved value from the routes `model` hook. Like `RouteInfo`, a
      `RouteInfoWithAttributes` represents a specific route within a Transition. It
      is read-only and internally immutable. It is also not observable, because a
      Transition instance is never changed after creation.

      A `RouteInfoWithAttributes` is not user-constructible; the only legal way to
      get one is from a valid `Transition`. However, you can import the type by
      using `import type` syntax with TypeScript or `import()` in JSDoc comments.

      @class RouteInfoWithAttributes
      @extends RouteInfo
      @public
     */
  /**
       This is the resolved return value from the
       route's model hook.
       @property {Object|Array|String|undefined} attributes
       @public
     */
  export type {
    RouteInfo as default,
    RouteInfoWithAttributes,
  } from '@ember/routing/lib/route-info';
}
