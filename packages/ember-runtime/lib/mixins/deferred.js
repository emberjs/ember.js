var get = Ember.get, set = Ember.set, slice = Array.prototype.slice;

var isCallback = function(fn) {
  var type = Ember.typeOf(fn);
  return type === 'function' || type === 'array';
};

/**
 @class

 @extends Ember.Mixin
 */
Ember.Deferred = Ember.Mixin.create(
  /** @scope Ember.Deferred.prototype */ {

  /*
    Add handlers to be called when the Deferred object is either resolved or rejected.
  */
  always: function(callbacks, target) {
    this.done(callbacks, target).fail(callbacks, target);

    return this;
  },

  /*
    Add handlers to be called when the Deferred object is resolved.
  */
  done: function(callbacks, target) {
    this._addCallbacks('_done', callbacks, target);

    return this;
  },

  /*
    Add handlers to be called when the Deferred object is rejected.
  */
  fail: function(callbacks, target) {
    this._addCallbacks('_fail', callbacks, target);

    return this;
  },

  /**
    Add handlers to be called when the Deferred object generates progress notifications.
  */
  progress: function(callbacks, target) {
    this._addCallbacks('_progress', callbacks, target);

    return this;
  },

  /**
    Add handlers to be called when the Deferred object is resolved or rejected.
  */
  then: function(doneCallbacks, failCallbacks, progressCallbacks, target) {
    if (arguments.length === 3 && !isCallback(progressCallbacks)) {
      target = progressCallbacks;
      progressCallbacks = null;
    }

    this.done(doneCallbacks, target).fail(failCallbacks, target);

    if (progressCallbacks) {
      this.progress(progressCallbacks, target);
    }

    return this;
  },

  /**
    Determine whether a Deferred object is in pending state.
  */
  isPending: Ember.computed('_state', function() {
    return get(this, '_state') === 'pending';
  }).cacheable(),

  /**
    Determine whether a Deferred object has been resolved.
  */
  isResolved: Ember.computed('_state', function() {
    return get(this, '_state') === 'resolved';
  }).cacheable(),

  /**
    Determine whether a Deferred object has been rejected.
  */
  isRejected: Ember.computed('_state', function() {
    return get(this, '_state') === 'rejected';
  }).cacheable(),

  /**
    Call the progressCallbacks on a Deferred object with the given args.
  */
  notify: function() {
    if (!get(this, 'isPending')) { return this; }

    this._invokeCallbacks('_progress', slice.call(arguments));

    return this;
  },

  /**
    Resolve a Deferred object and call any doneCallbacks with the given args.
  */
  resolve: function() {
    if (!get(this, 'isPending')) { return this; }

    this._invokeCallbacks('_done', slice.call(arguments));

    set(this, '_state', 'resolved');

    return this;
  },

  /**
    Reject a Deferred object and call any failCallbacks with the given args.
  */
  reject: function() {
    if (!get(this, 'isPending')) { return this; }

    this._invokeCallbacks('_fail', slice.call(arguments));

    set(this, '_state', 'rejected');

    return this;
  },

  /** @private */
  _state: 'pending',

  /** @private */
  _addCallbacks: function(state, callbacks, target) {
    get(this, state).add(callbacks, target || this);
  },

  /** @private */
  _invokeCallbacks: function(state, args) {
    var callbacks = get(this, state);

    callbacks.fire.apply(callbacks, args);
  },

  /** @private */
  _done: Ember.computed(function() {
    return Ember.Callbacks.create({memory: true, once: true});
  }).cacheable(),

  /** @private */
  _fail: Ember.computed(function() {
    return Ember.Callbacks.create({memory: true, once: true});
  }).cacheable(),

  /** @private */
  _progress: Ember.computed(function() {
    return Ember.Callbacks.create({memory: true});
  }).cacheable()
});
