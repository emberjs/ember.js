import { get } from 'ember-metal';
import { ControllerMixin } from 'ember-runtime';
import { prefixRouteNameArg } from '../utils';

/**
@module ember
@submodule ember-routing
*/

ControllerMixin.reopen({
  concatenatedProperties: ['queryParams'],

  /**
    Defines which query parameters the controller accepts.
    If you give the names `['category','page']` it will bind
    the values of these query parameters to the variables
    `this.category` and `this.page`

    @property queryParams
    @public
  */
  queryParams: null,

  /**
   This property is updated to various different callback functions depending on
   the current "state" of the backing route. It is used by
   `Ember.Controller.prototype._qpChanged`.

   The methods backing each state can be found in the `Ember.Route.prototype._qp` computed
   property return value (the `.states` property). The current values are listed here for
   the sanity of future travelers:

   * `inactive` - This state is used when this controller instance is not part of the active
     route heirarchy. Set in `Ember.Route.prototype._reset` (a `router.js` microlib hook) and
     `Ember.Route.prototype.actions.finalizeQueryParamChange`.
   * `active` - This state is used when this controller instance is part of the active
     route heirarchy. Set in `Ember.Route.prototype.actions.finalizeQueryParamChange`.
   * `allowOverrides` - This state is used in `Ember.Route.prototype.setup` (`route.js` microlib hook).

    @method _qpDelegate
    @private
  */
  _qpDelegate: null, // set by route

  /**
   During `Ember.Route#setup` observers are created to invoke this method
   when any of the query params declared in `Ember.Controller#queryParams` property
   are changed.


   When invoked this method uses the currently active query param update delegate
   (see `Ember.Controller.prototype._qpDelegate` for details) and invokes it with
   the QP key/value being changed.

    @method _qpChanged
    @private
  */
  _qpChanged(controller, _prop) {
    let prop = _prop.substr(0, _prop.length - 3);

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

    ```javascript
    App.Router.map(function() {
      this.route('blogPost', { path: ':blogPostId' }, function() {
        this.route('blogComment', { path: ':blogCommentId', resetNamespace: true });
      });
    });

    aController.transitionToRoute('blogComment', aPost, aComment);
    aController.transitionToRoute('blogComment', 1, 13);
    ```

    It is also possible to pass a URL (a string that starts with a
    `/`). This is intended for testing and debugging purposes and
    should rarely be used in production code.

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

    See also [replaceRoute](/api/classes/Ember.ControllerMixin.html#method_replaceRoute).

    @param {String} name the name of the route or a URL
    @param {...Object} models the model(s) or identifier(s) to be used
      while transitioning to the route.
    @param {Object} [options] optional hash with a queryParams property
      containing a mapping of query parameters
    @for Ember.ControllerMixin
    @method transitionToRoute
    @public
  */
  transitionToRoute(...args) {
    // target may be either another controller or a router
    let target = get(this, 'target');
    let method = target.transitionToRoute || target.transitionTo;
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

    ```javascript
    App.Router.map(function() {
      this.route('blogPost', { path: ':blogPostId' }, function() {
        this.route('blogComment', { path: ':blogCommentId', resetNamespace: true });
      });
    });

    aController.replaceRoute('blogComment', aPost, aComment);
    aController.replaceRoute('blogComment', 1, 13);
    ```

    It is also possible to pass a URL (a string that starts with a
    `/`). This is intended for testing and debugging purposes and
    should rarely be used in production code.

    ```javascript
    aController.replaceRoute('/');
    aController.replaceRoute('/blog/post/1/comment/13');
    ```

    @param {String} name the name of the route or a URL
    @param {...Object} models the model(s) or identifier(s) to be used
    while transitioning to the route.
    @for Ember.ControllerMixin
    @method replaceRoute
    @private
  */
  replaceRoute(...args) {
    // target may be either another controller or a router
    let target = get(this, 'target');
    let method = target.replaceRoute || target.replaceWith;
    return method.apply(target, prefixRouteNameArg(target, args));
  }
});

export default ControllerMixin;
