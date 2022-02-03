import { get } from '@ember/-internals/metal';
import { getOwner } from '@ember/-internals/owner';
import Controller from '@ember/controller';
import ControllerMixin from '@ember/controller/lib/controller_mixin';
import { Transition } from 'router_js';
import { Route, Router } from '../..';
import { deprecateTransitionMethods, prefixRouteNameArg, RouteArgs } from '../utils';

/**
@module ember
*/

ControllerMixin.reopen({
  concatenatedProperties: ['queryParams'],

  init() {
    this._super(...arguments);
    let owner = getOwner(this);
    if (owner) {
      this.namespace = owner.lookup('application:main');
      this.target = owner.lookup('router:main');
    }
  },

  /**
    Defines which query parameters the controller accepts.
    If you give the names `['category','page']` it will bind
    the values of these query parameters to the variables
    `this.category` and `this.page`.

    By default, query parameters are parsed as strings. This
    may cause unexpected behavior if a query parameter is used with `toggleProperty`,
    because the initial value set for `param=false` will be the string `"false"`, which is truthy.

    To avoid this, you may specify that the query parameter should be parsed as a boolean
    by using the following verbose form with a `type` property:
    ```javascript
      queryParams: [{
        category: {
          type: 'boolean'
        }
      }]
    ```
    Available values for the `type` parameter are `'boolean'`, `'number'`, `'array'`, and `'string'`.
    If query param type is not specified, it will default to `'string'`.

    @for Ember.ControllerMixin
    @property queryParams
    @public
  */
  queryParams: null,

  /**
   This property is updated to various different callback functions depending on
   the current "state" of the backing route. It is used by
   `Controller.prototype._qpChanged`.

   The methods backing each state can be found in the `Route.prototype._qp` computed
   property return value (the `.states` property). The current values are listed here for
   the sanity of future travelers:

   * `inactive` - This state is used when this controller instance is not part of the active
     route hierarchy. Set in `Route.prototype._reset` (a `router.js` microlib hook) and
     `Route.prototype.actions.finalizeQueryParamChange`.
   * `active` - This state is used when this controller instance is part of the active
     route hierarchy. Set in `Route.prototype.actions.finalizeQueryParamChange`.
   * `allowOverrides` - This state is used in `Route.prototype.setup` (`route.js` microlib hook).

    @method _qpDelegate
    @private
  */
  _qpDelegate: null, // set by route

  /**
   During `Route#setup` observers are created to invoke this method
   when any of the query params declared in `Controller#queryParams` property
   are changed.

   When invoked this method uses the currently active query param update delegate
   (see `Controller.prototype._qpDelegate` for details) and invokes it with
   the QP key/value being changed.

    @method _qpChanged
    @private
  */
  _qpChanged(controller: any, _prop: string) {
    let dotIndex = _prop.indexOf('.[]');
    let prop = dotIndex === -1 ? _prop : _prop.slice(0, dotIndex);

    let delegate = controller._qpDelegate;
    let value = get(controller, prop);
    delegate(prop, value);
  },

  /**
    Transition the application into another route. The route may
    be either a single route or route path:

    ```javascript
    aController.transitionToRoute('blogPosts');
    aController.transitionToRoute('blogPosts.recentEntries');
    ```

    Optionally supply a model for the route in question. The model
    will be serialized into the URL using the `serialize` hook of
    the route:

    ```javascript
    aController.transitionToRoute('blogPost', aPost);
    ```

    If a literal is passed (such as a number or a string), it will
    be treated as an identifier instead. In this case, the `model`
    hook of the route will be triggered:

    ```javascript
    aController.transitionToRoute('blogPost', 1);
    ```

    Multiple models will be applied last to first recursively up the
    route tree.

    ```app/router.js
    Router.map(function() {
      this.route('blogPost', { path: ':blogPostId' }, function() {
        this.route('blogComment', { path: ':blogCommentId', resetNamespace: true });
      });
    });
    ```

    ```javascript
    aController.transitionToRoute('blogComment', aPost, aComment);
    aController.transitionToRoute('blogComment', 1, 13);
    ```

    It is also possible to pass a URL (a string that starts with a
    `/`).

    ```javascript
    aController.transitionToRoute('/');
    aController.transitionToRoute('/blog/post/1/comment/13');
    aController.transitionToRoute('/blog/posts?sort=title');
    ```

    An options hash with a `queryParams` property may be provided as
    the final argument to add query parameters to the destination URL.

    ```javascript
    aController.transitionToRoute('blogPost', 1, {
      queryParams: { showComments: 'true' }
    });

    // if you just want to transition the query parameters without changing the route
    aController.transitionToRoute({ queryParams: { sort: 'date' } });
    ```

    See also [replaceRoute](/ember/release/classes/Ember.ControllerMixin/methods/replaceRoute?anchor=replaceRoute).

    @for Ember.ControllerMixin
    @method transitionToRoute
    @deprecated Use transitionTo from the Router service instead.
    @param {String} [name] the name of the route or a URL
    @param {...Object} models the model(s) or identifier(s) to be used
      while transitioning to the route.
    @param {Object} [options] optional hash with a queryParams property
      containing a mapping of query parameters
    @return {Transition} the transition object associated with this
      attempted transition
    @public
  */
  transitionToRoute<R extends Route>(...args: RouteArgs<R>): Transition {
    deprecateTransitionMethods('controller', 'transitionToRoute');

    // target may be either another controller or a router
    let target = get(this, 'target');

    // SAFETY: We can't actually assert that this is a full Controller or Router since some tests
    // mock out an object that only has the single method. Since this is deprecated, I think it's
    // ok to be a little less than proper here.
    let method = (target as Controller).transitionToRoute ?? (target as Router<R>).transitionTo;

    return method.apply(target, prefixRouteNameArg(this, args));
  },

  /**
    Transition into another route while replacing the current URL, if possible.
    This will replace the current history entry instead of adding a new one.
    Beside that, it is identical to `transitionToRoute` in all other respects.

    ```javascript
    aController.replaceRoute('blogPosts');
    aController.replaceRoute('blogPosts.recentEntries');
    ```

    Optionally supply a model for the route in question. The model
    will be serialized into the URL using the `serialize` hook of
    the route:

    ```javascript
    aController.replaceRoute('blogPost', aPost);
    ```

    If a literal is passed (such as a number or a string), it will
    be treated as an identifier instead. In this case, the `model`
    hook of the route will be triggered:

    ```javascript
    aController.replaceRoute('blogPost', 1);
    ```

    Multiple models will be applied last to first recursively up the
    route tree.

    ```app/router.js
    Router.map(function() {
      this.route('blogPost', { path: ':blogPostId' }, function() {
        this.route('blogComment', { path: ':blogCommentId', resetNamespace: true });
      });
    });
    ```

    ```
    aController.replaceRoute('blogComment', aPost, aComment);
    aController.replaceRoute('blogComment', 1, 13);
    ```

    It is also possible to pass a URL (a string that starts with a
    `/`).

    ```javascript
    aController.replaceRoute('/');
    aController.replaceRoute('/blog/post/1/comment/13');
    ```

    @for Ember.ControllerMixin
    @method replaceRoute
    @deprecated Use replaceWith from the Router service instead.
    @param {String} [name] the name of the route or a URL
    @param {...Object} models the model(s) or identifier(s) to be used
    while transitioning to the route.
    @param {Object} [options] optional hash with a queryParams property
    containing a mapping of query parameters
    @return {Transition} the transition object associated with this
      attempted transition
    @public
  */

  replaceRoute<R extends Route>(...args: RouteArgs<R>): Transition {
    deprecateTransitionMethods('controller', 'replaceRoute');
    // target may be either another controller or a router
    let target = get(this, 'target');

    // SAFETY: We can't actually assert that this is a full Controller or Router since some tests
    // mock out an object that only has the single method. Since this is deprecated, I think it's
    // ok to be a little less than proper here.
    let method = (target as Controller).replaceRoute ?? (target as Router<R>).replaceWith;

    return method.apply(target, prefixRouteNameArg(this, args));
  },
});

export default ControllerMixin;
