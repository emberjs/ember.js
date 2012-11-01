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
    `connectOutlet` creates a new instance of a provided view
    class, and assigns the new view to a property on the current controller.

    The purpose of this method is to enable views that use
    outlets to quickly assign new views for a given outlet.

    @method connectOutlet
    @param {String} outletName a name for the outlet to set
    @param {Ember.View} a view class to instantiate and assigne.
  */
  connectOutlet: function(outletName, viewClass) {
    var view = this.createOutletView(outletName, viewClass);
    set(this, outletName, view);

    return view;
  },

  /**
    `disconnectOutlet` removes previously attached view from given outlet.

    @method disconnectOutlet
    @param  {String} outletName the outlet name. (optional)
   */
  disconnectOutlet: function(outletName) {
    outletName = outletName || 'view';

    set(this, outletName, null);
  },

  /**
    Convenience method to connect controllers. This method makes other controllers
    available on the controller the method was invoked on.

    For example, to make the `personController` and the `postController` available
    on the `overviewController`, you would call:

        overviewController.connectControllers('person', 'post');

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
  },

  /**
    `createOutletView` is a hook you may want to override if you need to do
    something special with the view created for the outlet. For example
    you may want to implement views sharing across outlets.

    @method createOutletView
    @param outletName {String}
    @param viewClass {Ember.View}
  */
  createOutletView: function(outletName, viewClass) {
    return viewClass.create();
  }
});
