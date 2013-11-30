require('ember-runtime/system/object_proxy');
require('ember-runtime/controllers/controller');

/**
@module ember
@submodule ember-runtime
*/

/**
  `Ember.ObjectController` is part of Ember's Controller layer. It is intended
  to wrap a single object, proxying unhandled attempts to `get` and `set` to the underlying
  content object, and to forward unhandled action attempts to its `target`.

  `Ember.ObjectController` derives this functionality from its superclass
  `Ember.ObjectProxy` and the `Ember.ControllerMixin` mixin.

  @class ObjectController
  @namespace Ember
  @extends Ember.ObjectProxy
  @uses Ember.ControllerMixin
**/
Ember.ObjectController = Ember.ObjectProxy.extend(Ember.ControllerMixin);

if (Ember.FEATURES.isEnabled("ember-unloaded-model-warning")) {
  Ember.ObjectController.reopen({
    model: Ember.computed('content', function(_, value) {
      if (arguments.length > 1) {
        Ember.set(this, 'content', value);
        return value;
      } else {

        var model = Ember.get(this, 'content');
        if (!model && this._debugContainerKey) {
          var name = this._debugContainerKey.slice(11);
          var routeContainerName = 'route:' + name;
          var route = this.container.lookup(routeContainerName);
          if (route && !('currentModel' in route)) {
            Ember.warn("You retrieved the `model` property on the " + name + " controller before it was set by " + name + " route. Remember that you can use Route#modelFor to retrieve a model before a transition has completed");
          }
        }

        return model;
      }
    })
  });
}

