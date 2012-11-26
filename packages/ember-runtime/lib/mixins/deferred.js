var RSVP = requireModule("rsvp");

/**
@module ember
@submodule ember-runtime
*/

var get = Ember.get,
    slice = Array.prototype.slice;

/**
  @class Deferred
  @namespace Ember
  @extends Ember.Mixin
 */
Ember.Deferred = Ember.Mixin.create({

  /**
    Add handlers to be called when the Deferred object is resolved or rejected.

    @method then
    @param {Function} doneCallback a callback function to be called when done
    @param {Function} failCallback a callback function to be called when failed
  */
  then: function(doneCallback, failCallback) {
    return get(this, 'promise').then(doneCallback, failCallback);
  },

  /**
    Resolve a Deferred object and call any doneCallbacks with the given args.

    @method resolve
  */
  resolve: function(value) {
    get(this, 'promise').resolve(value);
  },

  /**
    Reject a Deferred object and call any failCallbacks with the given args.

    @method reject
  */
  reject: function(value) {
    get(this, 'promise').reject(value);
  },

  promise: Ember.computed(function() {
    return new RSVP.Promise();
  })
});
