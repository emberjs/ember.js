var get = Ember.get, set = Ember.set,
    slice = Array.prototype.slice,
    forEach = Ember.ArrayPolyfills.forEach,
    indexOf = Ember.ArrayPolyfills.indexOf;

var isCallback = function(fn, target) {
  var type = Ember.typeOf(fn);
  return type === 'function' || type === 'array' || (type === 'string' && target);
};

/**
 @class

 A multi-purpose callbacks list object that provides a powerful way to manage callback lists.

 @extends Ember.Object
 */
Ember.Callbacks = Ember.Object.extend(
/** @scope Ember.Callbacks.prototype */ {

  /**
    Ensures the callback list can only be fired once.

    @type Boolean
  */
  once: false,

  /**
    Keep track of previous values and will call any callback
    added after the list has been fired right away with the latest
    "memorized" values.

    @type Boolean
  */
  memory: false,

  /**
    Ensures a callback can only be added once (so there are no duplicates in the list).

    @type Boolean
  */
  unique: false,

  /**
    Determine if the callbacks have already been called at least once.

    @type Boolean
  */
  fired: false,

  /**
    Add a callback or a collection of callbacks to a callback list.
  */
  add: function(callbacks, target) {
    var unique = get(this, 'unique'),
        list = [];

    Ember.assert("Callback have to be a function, an array of functions or a string. In case of a string you have to supply a target", isCallback(callbacks, target));

    callbacks = Ember.makeArray(callbacks);

    forEach.call(callbacks, function(callback) {
      if (!unique || !this.has(callback, target)) {
        list.push({
          target: target || null,
          method: callback
        });
      }
    }, this);

    if (!get(this, 'fired')) {
      get(this, 'list').pushObjects(list);
    } else if (get(this, 'memory')) {
      this._invoke(list);
    }
  },

  /**
    Remove a callback or a collection of callbacks from a callback list.
  */
  remove: function(callbacks, target) {
    var list = get(this, 'list');

    callbacks = Ember.makeArray(callbacks);

    forEach.call(list, function(callback) {
      var contains = indexOf.call(callbacks, callback.method) !== -1;

      if (contains && (!target || callback.target === target)) {
        list.removeObject(callback);
      }
    });
  },

  /**
    Remove all of the callbacks from a list.
  */
  clear: function() {
    set(this, 'memorized', null);
    set(this, 'list', Ember.A());
  },

  /**
    Call all of the callbacks with the given arguments
  */
  fire: function() {
    var once = get(this, 'once'),
        fired = get(this, 'fired');

    if (once && fired) {
      return;
    } else if (!fired) {
      set(this, 'fired', true);
    }

    var args = slice.call(arguments);

    this._invoke(get(this, 'list'), args);

    set(this, 'memorized', args);

    if (once) {
      set(this, 'list', Ember.A());
    }
  },

  /**
    Determine whether a supplied callback is in a list.
  */
  has: function(method, target) {
    return !!get(this, 'list').find(function(callback) {
      return callback.method === method && (!target || callback.target === target);
    });
  },

  /** @private */
  _invoke: function(callbacks, args) {
    args = args || get(this, 'memorized');

    Ember.run.once(function() {
      forEach.call(callbacks, function(callback) {
        var method = callback.method, target = callback.target;
        if (method === 'string') { method = target[method]; }
        method.apply(target, args);
      });
    });
  },

  /** @private */
  memorized: null,

  init: function() {
    set(this, 'list', Ember.A());
  }
});
