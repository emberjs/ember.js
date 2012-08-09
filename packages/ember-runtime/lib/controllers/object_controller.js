require('ember-runtime/system/object_proxy');
require('ember-runtime/controllers/controller');

/**
  @class
  
  Ember.ObjectController is part of Ember's Controller layer. A single
  shared instance of each Ember.ObjectController subclass in your application's
  namespace will be created at application initialization and be stored on your
  application's Ember.Router instance.
  
  Ember.ObjectController derives its functionality from its superclass
  Ember.ObjectProxy and the Ember.ControllerMixin mixin.
  
  @extends Ember.ObjectProxy
  @extends Ember.ControllerMixin
**/
Ember.ObjectController = Ember.ObjectProxy.extend(Ember.ControllerMixin);
