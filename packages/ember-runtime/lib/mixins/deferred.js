var RSVP = requireModule("rsvp");

RSVP.configure('async', function(callback, binding) {
  Ember.run.schedule('actions', binding, callback);
});

/**
@module ember
@submodule ember-runtime
*/

var get = Ember.get;

/**
  @class Deferred
  @namespace Ember
  @extends Ember.Mixin
 */
Ember.DeferredMixin = Ember.Mixin.create({
  /**
    Add handlers to be called when the Deferred object is resolved or rejected.

    @method then
    @param {Function} doneCallback a callback function to be called when done
    @param {Function} failCallback a callback function to be called when failed
  */
  then: function(resolve, reject) {
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

    return promise.then(resolve && fulfillmentHandler, reject);
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

  _deferred: Ember.computed(function() {
    return RSVP.defer();
  })
});

