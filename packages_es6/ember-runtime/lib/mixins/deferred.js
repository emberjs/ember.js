import Ember from "ember-metal/core"; // Ember.FEATURES, Ember.Test
import {get} from "ember-metal/property_get";
import {Mixin} from "ember-metal/mixin";
import {computed} from "ember-metal/computed";
import run from "ember-metal/run_loop";
import RSVP from "ember-runtime/ext/rsvp";

if (Ember.FEATURES['ember-runtime-test-friendly-promises']) {

  var asyncStart = function() {
    if (Ember.Test && Ember.Test.adapter) {
      Ember.Test.adapter.asyncStart();
    }
  };

  var asyncEnd = function() {
    if (Ember.Test && Ember.Test.adapter) {
      Ember.Test.adapter.asyncEnd();
    }
  };

  RSVP.configure('async', function(callback, promise) {
    var async = !run.currentRunLoop;

    if (Ember.testing && async) { asyncStart(); }

    run.backburner.schedule('actions', function(){
      if (Ember.testing && async) { asyncEnd(); }
      callback(promise);
    });
  });
} else {
  RSVP.configure('async', function(callback, promise) {
    run.backburner.schedule('actions', function(){
      callback(promise);
    });
  });
}

RSVP.Promise.prototype.fail = function(callback, label){
  Ember.deprecate('RSVP.Promise.fail has been renamed as RSVP.Promise.catch');
  return this['catch'](callback, label);
};

/**
@module ember
@submodule ember-runtime
*/


/**
  @class Deferred
  @namespace Ember
 */
var DeferredMixin = Mixin.create({
  /**
    Add handlers to be called when the Deferred object is resolved or rejected.

    @method then
    @param {Function} resolve a callback function to be called when done
    @param {Function} reject  a callback function to be called when failed
  */
  then: function(resolve, reject, label) {
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
  */
  resolve: function(value) {
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
  */
  reject: function(value) {
    get(this, '_deferred').reject(value);
  },

  _deferred: computed(function() {
    return RSVP.defer('Ember: DeferredMixin - ' + this);
  })
});

export default DeferredMixin;
