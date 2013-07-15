/**
@module ember
@submodule ember-application
*/

var get = Ember.get, set = Ember.set;
var ControllersProxy = Ember.Object.extend({
  controller: null,

  unknownProperty: function(controllerName) {
    var controller = get(this, 'controller'),
      needs = get(controller, 'needs'),
      container = controller.get('container'),
      dependency;

    for (var i=0, l=needs.length; i<l; i++) {
      dependency = needs[i];
      if (dependency === controllerName) {
        return container.lookup('controller:' + controllerName);
      }
    }
  }
});

function verifyDependencies(controller) {
  var needs = get(controller, 'needs'),
      container = get(controller, 'container'),
      dependency, satisfied = true;

  for (var i=0, l=needs.length; i<l; i++) {
    dependency = needs[i];
    if (dependency.indexOf(':') === -1) {
      dependency = "controller:" + dependency;
    }

    if (!container.has(dependency)) {
      satisfied = false;
      Ember.assert(controller + " needs " + dependency + " but it does not exist", false);
    }
  }

  return satisfied;
}

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
    this._super.apply(this, arguments);

    // Structure asserts to still do verification but not string concat in production
    if (!verifyDependencies(this)) {
      Ember.assert("Missing dependencies", false);
    }
  },

  controllerFor: function(controllerName) {
    Ember.deprecate("Controller#controllerFor is deprecated, please use Controller#needs instead");
    var container = get(this, 'container');
    return container.lookup('controller:' + controllerName);
  },

  controllers: Ember.computed(function() {
    return ControllersProxy.create({ controller: this });
  })
});
