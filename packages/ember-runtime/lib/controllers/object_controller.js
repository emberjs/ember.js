require('ember-runtime/system/object_proxy');
require('ember-runtime/controllers/controller');

/**
@module ember
@submodule ember-runtime
*/

/**
  `Ember.ObjectController` is part of Ember's Controller layer.

  `Ember.ObjectController` derives its functionality from its superclass
  `Ember.ObjectProxy` and the `Ember.ControllerMixin` mixin.

  @class ObjectController
  @namespace Ember
  @extends Ember.ObjectProxy
  @uses Ember.ControllerMixin
**/
Ember.ObjectController = Ember.ObjectProxy.extend(Ember.ControllerMixin);
