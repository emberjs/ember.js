require("ember-runtime/mixins/deferred");
require("ember-runtime/system/object");

var DeferredMixin = Ember.DeferredMixin, // mixins/deferred
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
