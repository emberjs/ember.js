import Ember from 'ember-metal/core';
import DeferredMixin from "ember-runtime/mixins/deferred";
import EmberObject from "ember-runtime/system/object";

var Deferred = EmberObject.extend(DeferredMixin, {
  init: function() {
    Ember.deprecate('Usage of Ember.Deferred is deprecated.');
    this._super();
  }
});

Deferred.reopenClass({
  promise: function(callback, binding) {
    var deferred = Deferred.create();
    callback.call(binding, deferred);
    return deferred;
  }
});

export default Deferred;
