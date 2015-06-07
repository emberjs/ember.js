import Ember from "ember-metal/core"; // Ember.FEATURES, Ember.Test
import { get } from "ember-metal/property_get";
import { Mixin } from "ember-metal/mixin";
import { computed } from "ember-metal/computed";
import RSVP from "ember-runtime/ext/rsvp";

/**
@module ember
@submodule ember-runtime
*/


/**
  @class Deferred
  @namespace Ember
  @private
*/
export default Mixin.create({
  /**
    Add handlers to be called when the Deferred object is resolved or rejected.

    @method then
    @param {Function} resolve a callback function to be called when done
    @param {Function} reject  a callback function to be called when failed
    @private
  */
  then(resolve, reject, label) {
    var deferred, promise, entity;

    entity = this;
    deferred = get(this, '_deferred');
    promise = deferred.promise;

    function fulfillmentHandler(fulfillment) {
      if (fulfillment === promise) {
        return resolve(entity);
      } else {
        return resolve(fulfillment);
      }
    }

    return promise.then(resolve && fulfillmentHandler, reject, label);
  },

  /**
    Resolve a Deferred object and call any `doneCallbacks` with the given args.

    @method resolve
    @private
  */
  resolve(value) {
    var deferred, promise;

    deferred = get(this, '_deferred');
    promise = deferred.promise;

    if (value === this) {
      deferred.resolve(promise);
    } else {
      deferred.resolve(value);
    }
  },

  /**
    Reject a Deferred object and call any `failCallbacks` with the given args.

    @method reject
    @private
  */
  reject(value) {
    get(this, '_deferred').reject(value);
  },

  _deferred: computed(function() {
    Ember.deprecate('Usage of Ember.DeferredMixin or Ember.Deferred is deprecated.', this._suppressDeferredDeprecation, { url: 'http://emberjs.com/guides/deprecations/#toc_deprecate-ember-deferredmixin-and-ember-deferred' });

    return RSVP.defer('Ember: DeferredMixin - ' + this);
  })
});
