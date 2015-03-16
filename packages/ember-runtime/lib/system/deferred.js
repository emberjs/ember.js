import Ember from 'ember-metal/core';
import DeferredMixin from "ember-runtime/mixins/deferred";
import EmberObject from "ember-runtime/system/object";

var Deferred = EmberObject.extend(DeferredMixin, {
  init: function() {
    Ember.deprecate('Usage of Ember.Deferred is deprecated.', false, { url: 'http://emberjs.com/guides/deprecations/#toc_deprecate-ember-deferredmixin-and-ember-deferred' });
    this._super(...arguments);
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
