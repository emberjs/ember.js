require('ember-runtime/system/object_proxy');
require('ember-runtime/controllers/controller');
/**
  @class

  Ember.ObjectController provides a binding proxy so that you only have
  to set up your view bindings once; to change what's displayed, simply
  swap out the `content` property on the controller.

  See Ember.ObjectProxy
*/
Ember.ObjectController = Ember.ObjectProxy.extend(Ember.ControllerMixin, {
  /**
   Directly set a property of the controller itself without proxying to the
   backing `content`. Generally this should be done on extend() or create()
   if you know the properties that will shadow the content.

   `inject` will cause a property change, allowing the proxy to observe injections.
  */
  inject: function (key, value) {
    this.proxySet(key, value);
  }
});
