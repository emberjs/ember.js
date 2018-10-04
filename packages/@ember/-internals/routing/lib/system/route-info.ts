/**
  A `RouteInfoWithAttributes` is an object that contains
  metadata, including the resolved value from the routes
  `model` hook. Like `RouteInfo`, a `RouteInfoWithAttributes`
  represents a specific route with in a Transition.
  It is read-only and internally immutable. It is also not
  observable, because a Transition instance is never
  changed after creation.

  @class RouteInfoWithAttributes
  @category ember-routing-router-service
  @public

  The dot-separated, fully-qualified name of the
  route, like "people.index".
  @property {String} name
  @category ember-routing-router-service
  @public

  The final segment of the fully-qualified name of
  the route, like "index"
  @property {String} localName
  @category ember-routing-router-service
  @public

  The values of the route's parametes. These are the
  same params that are recieved as arguments to the
  route's model hook. Contains only the parameters
  valid for this route, if any (params for parent or
  child routes are not merged).
  @property {Object} params
  @category ember-routing-router-service
  @public

  The ordered list of the names of the params
  required for this route. It will contain the same
  strings as Object.keys(params), but here the order
  is significant. This allows users to correctly pass
  params into routes programmatically.
  @property {Array} paramNames
  @category ember-routing-router-service
  @public

  The values of any queryParams on this route.
  @property {Object} queryParams
  @category ember-routing-router-service
  @public

  This is the resolved return value from the
  route's model hook.
  @property {Object|Array|String} attributes
  @category ember-routing-router-service
  @public

  A reference to the parent route's RouteInfo.
  This can be used to traverse upward to the topmost
  `RouteInfo`.
  @property {RouteInfo|null} parent
  @category ember-routing-router-service
  @public

  A reference to the child route's RouteInfo.
  This can be used to traverse downward to the
  leafmost `RouteInfo`.
  @property {RouteInfo|null} child
  @category ember-routing-router-service
  @public

  Allows you to traverse through the linked list
  of `RouteInfo`s from the topmost to leafmost.
  Returns the first `RouteInfo` in the linked list
  for which the callback returns true.

    This method is similar to the `find()` method
    defined in ECMAScript 2015.

    The callback method you provide should have the
    following signature (all parameters are optional):

    ```javascript
    function(item, index, array);
    ```

    - `item` is the current item in the iteration.
    - `index` is the current index in the iteration.
    - `array` is the array itself.

    It should return the `true` to include the item in
    the results, `false` otherwise.

    Note that in addition to a callback, you can also
    pass an optional target object that will be set as
    `this` on the context.

  @method find
  @param {Function} callback the callback to execute
  @param {Object} [target*] optional target to use
  @returns {Object} Found item or undefined
  @category ember-routing-router-service
  @public
*/

/**
  A RouteInfo is an object that contains metadata
  about a specific route with in a Transition. It is
  read-only and internally immutable. It is also not
  observable, because a Transition instance is never
  changed after creation.

  @class RouteInfo
  @category ember-routing-router-service
  @public

  The dot-separated, fully-qualified name of the
  route, like "people.index".
  @property {String} name
  @category ember-routing-router-service
  @public

  The final segment of the fully-qualified name of
  the route, like "index"
  @property {String} localName
  @category ember-routing-router-service
  @public

  The values of the route's parametes. These are the
  same params that are recieved as arguments to the
  route's model hook. Contains only the parameters
  valid for this route, if any (params for parent or
  child routes are not merged).
  @property {Object} params
  @category ember-routing-router-service
  @public

  The ordered list of the names of the params
  required for this route. It will contain the same
  strings as Object.keys(params), but here the order
  is significant. This allows users to correctly pass
  params into routes programmatically.
  @property {Array} paramNames
  @category ember-routing-router-service
  @public

  The values of any queryParams on this route.
  @property {Object} queryParams
  @category ember-routing-router-service
  @public

  A reference to the parent route's RouteInfo.
  This can be used to traverse upward to the topmost
  `RouteInfo`.
  @property {RouteInfo|null} parent
  @category ember-routing-router-service
  @public

  A reference to the child route's RouteInfo.
  This can be used to traverse downward to the
  leafmost `RouteInfo`.
  @property {RouteInfo|null} child
  @category ember-routing-router-service
  @public

  Allows you to traverse through the linked list
  of `RouteInfo`s from the topmost to leafmost.
  Returns the first `RouteInfo` in the linked list
  for which the callback returns true.

    This method is similar to the `find()` method
    defined in ECMAScript 2015.

    The callback method you provide should have the
    following signature (all parameters are optional):

    ```javascript
    function(item, index, array);
    ```

    - `item` is the current item in the iteration.
    - `index` is the current index in the iteration.
    - `array` is the array itself.

    It should return the `true` to include the item in
    the results, `false` otherwise.

    Note that in addition to a callback, you can also
    pass an optional target object that will be set as
    `this` on the context.

  @method find
  @param {Function} callback the callback to execute
  @param {Object} [target*] optional target to use
  @returns {Object} Found item or undefined
  @category ember-routing-router-service
  @public
*/
