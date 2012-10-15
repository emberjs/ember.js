/**
@module ember
@submodule ember-runtime
*/

var get = Ember.get, set = Ember.set,
    slice = Array.prototype.slice,
    forEach = Ember.ArrayPolyfills.forEach;

var Callbacks = function(target, once) {
  this.target = target;
  this.once = once || false;
  this.list = [];
  this.fired = false;
  this.off = false;
};

Callbacks.prototype = {
  add: function(callback) {
    if (this.off) { return; }

    this.list.push(callback);

    if (this.fired) { this.flush(); }
  },

  fire: function() {
    if (this.off || this.once && this.fired) { return; }
    if (!this.fired) { this.fired = true; }

    this.args = slice.call(arguments);

    if (this.list.length > 0) { this.flush(); }
  },

  flush: function() {
    Ember.run.once(this, 'flushCallbacks');
  },

  flushCallbacks: function() {
    forEach.call(this.list, function(callback) {
      callback.apply(this.target, this.args);
    }, this);
    if (this.once) { this.list = []; }
  }
};


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
    @param {Function} progressCallback a callback function to be called when progressed
  */
  then: function(doneCallback, failCallback, progressCallback) {
    if (doneCallback) {
      get(this, 'deferredDone').add(doneCallback);
    }
    if (failCallback) {
      get(this, 'deferredFail').add(failCallback);
    }
    if (progressCallback) {
      get(this, 'deferredProgress').add(progressCallback);
    }

    return this;
  },

  /**
    Call the progressCallbacks on a Deferred object with the given args.

    @method notify
  */
  notify: function() {
    var callbacks = get(this, 'deferredProgress');
    callbacks.fire.apply(callbacks, slice.call(arguments));

    return this;
  },

  /**
    Resolve a Deferred object and call any doneCallbacks with the given args.

    @method resolve
  */
  resolve: function() {
    var callbacks = get(this, 'deferredDone');
    callbacks.fire.apply(callbacks, slice.call(arguments));
    set(this, 'deferredProgress.off', true);
    set(this, 'deferredFail.off', true);

    return this;
  },

  /**
    Reject a Deferred object and call any failCallbacks with the given args.

    @method reject
  */
  reject: function() {
    var callbacks = get(this, 'deferredFail');
    callbacks.fire.apply(callbacks, slice.call(arguments));
    set(this, 'deferredProgress.off', true);
    set(this, 'deferredDone.off', true);

    return this;
  },

  deferredDone: Ember.computed(function() {
    return new Callbacks(this, true);
  }).cacheable(),

  deferredFail: Ember.computed(function() {
    return new Callbacks(this, true);
  }).cacheable(),

  deferredProgress: Ember.computed(function() {
    return new Callbacks(this);
  }).cacheable()
});
