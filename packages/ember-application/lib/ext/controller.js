/**
@module ember
@submodule ember-application
*/

var get = Ember.get, set = Ember.set;

function verifyDependencies(controller) {
  var needs = get(controller, 'needs'),
      container = get(controller, 'container'),
      satisfied = true,
      dependency, i, l;

  for (i=0, l=needs.length; i<l; i++) {
    dependency = needs[i];
    if (dependency.indexOf(':') === -1) {
      dependency = "controller:" + dependency;
    }

    if (!container.has(dependency)) {
      satisfied = false;
      Ember.assert(controller + " needs " + dependency + " but it does not exist", false);
    }
  }

  if (l > 0) {
    set(controller, 'controllers', {
      unknownProperty: function(controllerName) {
        var dependency, i, l;
        for (i=0, l=needs.length; i<l; i++) {
          dependency = needs[i];
          if (dependency === controllerName) {
            return container.lookup('controller:' + controllerName);
          }
        }
      }
    });
  }
  return satisfied;
}

/**
  @class ControllerMixin
  @namespace Ember
*/
Ember.ControllerMixin.reopen({
  concatenatedProperties: ['needs'],

  /**
    An array of other controller objects available inside
    instances of this controller via the `controllers`
    property:

    For example, when you define a controller:

    ```javascript
    App.CommentsController = Ember.ArrayController.extend({
      needs: ['post']
    });
    ```

    The application's single instance of these other
    controllers are accessible by name through the
    `controllers` property:

    ```javascript
    this.get('controllers.post'); // instance of App.PostController
    ```

    This is only available for singleton controllers.

    @property {Array} needs
    @default []
  */
  needs: [],

  init: function() {
    // Structure asserts to still do verification but not string concat in production
    if (!verifyDependencies(this)) {
      Ember.assert("Missing dependencies", false);
    }

    this._super.apply(this, arguments);
  },

  controllerFor: function(controllerName) {
    Ember.deprecate("Controller#controllerFor is deprecated, please use Controller#needs instead");
    return Ember.controllerFor(get(this, 'container'), controllerName);
  },

  /**
    Stores the instances of other controllers available from within
    this controller. Any controller listed by name in the `needs`
    property will be accessible by name through this property.

    ```javascript
    App.CommentsController = Ember.ArrayController.extend({
      needs: ['post'],
      postTitle: function(){
        var currentPost = this.get('controllers.post'); // instance of App.PostController
        return currentPost.get('title');
      }.property('controllers.post.title')
    });
    ```

    @see {Ember.ControllerMixin#needs}
    @property {Object} controllers
    @default null
  */
  controllers: null
});
