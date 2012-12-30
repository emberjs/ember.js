require("ember-runtime/mixins/deferred");
require("ember-runtime/system/object");

var DeferredMixin = Ember.DeferredMixin, // mixins/deferred
    EmberObject = Ember.Object,          // system/object
    get = Ember.get;

var Deferred = Ember.Object.extend(DeferredMixin);

Deferred.reopenClass({
  promise: function(callback, binding) {
    var deferred = Deferred.create();
    callback.call(binding, deferred);
    return get(deferred, 'promise');
  }
});

Ember.Deferred = Deferred;
