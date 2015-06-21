import Ember from 'ember-metal/core'; // FEATURES, deprecate
import { get } from 'ember-metal/property_get';
import ControllerMixin from 'ember-runtime/mixins/controller';

/**
@module ember
@submodule ember-routing
*/

ControllerMixin.reopen({
  concatenatedProperties: ['queryParams'],

  /**
    Defines which query parameters the controller accepts.
    If you give the names ['category','page'] it will bind
    the values of these query parameters to the variables
    `this.category` and `this.page`

    @property queryParams
    @public
  */
  queryParams: null,

  /**
    @property _qpDelegate
    @private
  */
  _qpDelegate: null, // set by route

  /**
    @method _qpChanged
    @private
  */
  _qpChanged(controller, _prop) {
    var prop = _prop.substr(0, _prop.length-3);

    var delegate = controller._qpDelegate;
    var value = get(controller, prop);
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
    resource tree.

    ```javascript
    App.Router.map(function() {
      this.resource('blogPost', {path:':blogPostId'}, function() {
        this.resource('blogComment', {path: ':blogCommentId'});
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
      queryParams: {showComments: 'true'}
    });

    // if you just want to transition the query parameters without changing the route
    aController.transitionToRoute({queryParams: {sort: 'date'}});
    ```

    See also [replaceRoute](/api/classes/Ember.ControllerMixin.html#method_replaceRoute).

    @param {String} name the name of the route or a URL
    @param {...Object} models the model(s) or identifier(s) to be used
      while transitioning to the route.
    @param {Object} [options] optional hash with a queryParams property
      containing a mapping of query parameters
    @for Ember.ControllerMixin
    @method transitionToRoute
    @private
  */
  transitionToRoute() {
    // target may be either another controller or a router
    var target = get(this, 'target');
    var method = target.transitionToRoute || target.transitionTo;
    return method.apply(target, arguments);
  },

  /**
    @deprecated
    @for Ember.ControllerMixin
    @method transitionTo
    @private
  */
  transitionTo() {
    Ember.deprecate('transitionTo is deprecated. Please use transitionToRoute.');
    return this.transitionToRoute(...arguments);
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
    resource tree.

    ```javascript
    App.Router.map(function() {
      this.resource('blogPost', {path:':blogPostId'}, function() {
        this.resource('blogComment', {path: ':blogCommentId'});
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
  replaceRoute() {
    // target may be either another controller or a router
    var target = get(this, 'target');
    var method = target.replaceRoute || target.replaceWith;
    return method.apply(target, arguments);
  },

  /**
    @deprecated
    @for Ember.ControllerMixin
    @method replaceWith
    @private
  */
  replaceWith() {
    Ember.deprecate('replaceWith is deprecated. Please use replaceRoute.');
    return this.replaceRoute(...arguments);
  }
});

export default ControllerMixin;
