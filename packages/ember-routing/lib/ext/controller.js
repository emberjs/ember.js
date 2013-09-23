/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set;

Ember.ControllerMixin.reopen({
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

    Multiple models will be applied last to first recursively up the
    resource tree.

    ```javascript

      this.resource('blogPost', {path:':blogPostId'}, function(){
        this.resource('blogComment', {path: ':blogCommentId'});
      });
      
      aController.transitionToRoute('blogComment', aPost, aComment);
    ```

    See also 'replaceRoute'.

    @param {String} name the name of the route
    @param {...Object} models the model(s) to be used while transitioning
    to the route.
    @for Ember.ControllerMixin
    @method transitionToRoute
  */
  transitionToRoute: function() {
    // target may be either another controller or a router
    var target = get(this, 'target'),
        method = target.transitionToRoute || target.transitionTo;
    return method.apply(target, arguments);
  },

  /**
    @deprecated
    @for Ember.ControllerMixin
    @method transitionTo
  */
  transitionTo: function() {
    Ember.deprecate("transitionTo is deprecated. Please use transitionToRoute.");
    return this.transitionToRoute.apply(this, arguments);
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

    Multiple models will be applied last to first recursively up the
    resource tree.

    ```javascript

      this.resource('blogPost', {path:':blogPostId'}, function(){
        this.resource('blogComment', {path: ':blogCommentId'});
      });
      
      aController.replaceRoute('blogComment', aPost, aComment);
    ```

    @param {String} name the name of the route
    @param {...Object} models the model(s) to be used while transitioning
    to the route.
    @for Ember.ControllerMixin
    @method replaceRoute
  */
  replaceRoute: function() {
    // target may be either another controller or a router
    var target = get(this, 'target'),
        method = target.replaceRoute || target.replaceWith;
    return method.apply(target, arguments);
  },

  /**
    @deprecated
    @for Ember.ControllerMixin
    @method replaceWith
  */
  replaceWith: function() {
    Ember.deprecate("replaceWith is deprecated. Please use replaceRoute.");
    return this.replaceRoute.apply(this, arguments);
  }
});
