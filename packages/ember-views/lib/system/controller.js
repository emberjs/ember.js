/**
@module ember
@submodule ember-views
*/

var get = Ember.get, set = Ember.set;

// Original class declaration and documentation in runtime/lib/controllers/controller.js
// NOTE: It may be possible with YUIDoc to combine docs in two locations

/**
Additional methods for the ControllerMixin

@class ControllerMixin
@namespace Ember
*/
Ember.ControllerMixin.reopen({

  target: null,
  controllers: null,
  namespace: null,
  view: null,

  /**
    Convenience method to connect controllers. This method makes other controllers
    available on the controller the method was invoked on.

    For example, to make the `personController` and the `postController` available
    on the `overviewController`, you would call:

    ```javascript
    overviewController.connectControllers('person', 'post');
    ```

    @method connectControllers
    @param {String...} controllerNames the controllers to make available
  */
  connectControllers: function() {
    var controllers = get(this, 'controllers'),
        controllerNames = Array.prototype.slice.apply(arguments),
        controllerName;

    for (var i=0, l=controllerNames.length; i<l; i++) {
      controllerName = controllerNames[i] + 'Controller';
      set(this, controllerName, get(controllers, controllerName));
    }
  }
});
