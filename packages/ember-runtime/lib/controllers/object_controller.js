require('ember-runtime/system/object_proxy');
require('ember-runtime/controllers/controller');

var get = Ember.get, set = Ember.set;

/**
@module ember
@submodule ember-runtime
*/

/**
  `Ember.ObjectController` is part of Ember's Controller layer. A single shared
  instance of each `Ember.ObjectController` subclass in your application's
  namespace will be created at application initialization and be stored on your
  application's `Ember.Router` instance.

  `Ember.ObjectController` derives its functionality from its superclass
  `Ember.ObjectProxy` and the `Ember.ControllerMixin` mixin.

  @class ObjectController
  @namespace Ember
  @extends Ember.ObjectProxy
  @uses Ember.ControllerMixin
**/
Ember.ObjectController = Ember.ObjectProxy.extend(Ember.ControllerMixin, {
  model: Ember.computed(function(key, value) {
    if (arguments.length > 1) {
      return set(this, 'content', value);
    } else {
      return get(this, 'content');
    }
  }).property('content')
});
