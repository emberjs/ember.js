/**
@module ember
@submodule ember-application
*/

var get = Ember.get, set = Ember.set;

function verifyNeedsDependencies(controller, container, needs) {
  var dependency, i, l;

  for (i=0, l=needs.length; i<l; i++) {
    dependency = needs[i];
    if (dependency.indexOf(':') === -1) {
      dependency = "controller:" + dependency;
    }

    // Structure assert to still do verification but not string concat in production
    if (!container.has(dependency)) {
      Ember.assert(Ember.inspect(controller) + " needs " + dependency + " but it does not exist", false);
    }
  }
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

    Given that you have a nested controller (nested resource):

    ```javascript
    App.CommentsNewController = Ember.ObjectController.extend({
    });
    ```

    When you define a controller that requires access to a nested one:

    ```javascript
    App.IndexController = Ember.ObjectController.extend({
      needs: ['commentsNew']
    });
    ```

    You will be able to get access to it:

    ```javascript
    this.get('controllers.commentsNew'); // instance of App.CommentsNewController
    ```

    This is only available for singleton controllers.

    @property {Array} needs
    @default []
  */
  needs: [],

  init: function() {
    var needs = get(this, 'needs'),
    length = get(needs, 'length');

    if (length > 0) {
      Ember.assert(' `' + Ember.inspect(this) + ' specifies `needs`, but does not have a container. Please ensure this controller was instantiated with a container.', this.container);

      verifyNeedsDependencies(this, this.container, needs);

      // if needs then initialize controllers proxy
      get(this, 'controllers');
    }

    this._super.apply(this, arguments);
  },

  /**
    @method controllerFor
    @see {Ember.Route#controllerFor}
    @deprecated Use `needs` instead
  */
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
  controllers: Ember.computed(function() {
    var controller = this;

    return {
      needs: get(controller, 'needs'),
      container: get(controller, 'container'),
      unknownProperty: function(controllerName) {
        var needs = this.needs,
          dependency, i, l;
        for (i=0, l=needs.length; i<l; i++) {
          dependency = needs[i];
          if (dependency === controllerName) {
            return this.container.lookup('controller:' + controllerName);
          }
        }

        var errorMessage = Ember.inspect(controller) + '#needs does not include `' + controllerName + '`. To access the ' + controllerName + ' controller from ' + Ember.inspect(controller) + ', ' + Ember.inspect(controller) + ' should have a `needs` property that is an array of the controllers it has access to.';
        throw new ReferenceError(errorMessage);
      }
    };
  }).readOnly()
});
