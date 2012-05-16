var get = Ember.get, set = Ember.set;

/**
  This file implements the `location` API used by Ember's router.

  That API is:

  getURL: returns the current URL
  setURL(path): sets the current URL
  onUpdateURL(callback): triggers the callback when the URL changes

  Calling setURL will not trigger onUpdateURL callbacks.
*/

/**
  Ember.HashLocation implements the location API using the browser's
  hash. At present, it relies on a hashchange event existing in the
  browser.
*/
Ember.HashLocation = Ember.Object.extend({
  init: function() {
    set(this, 'location', get(this, 'location') || window.location);
    set(this, 'callbacks', Ember.A());
  },

  /**
    @private

    Returns the current `location.hash`, minus the '#' at the front.
  */
  getURL: function() {
    return get(this, 'location').hash.substr(1);
  },

  /**
    @private

    Set the `location.hash` and remembers what was set. This prevents
    `onUpdateURL` callbacks from triggering when the hash was set by
    `HashLocation`.
  */
  setURL: function(path) {
    get(this, 'location').hash = path;
    set(this, 'lastSetURL', path);
  },

  /**
    @private

    Register a callback to be invoked when the hash changes. These
    callbacks will execute when the user presses the back or forward
    button, but not after `setURL` is invoked.
  */
  onUpdateURL: function(callback) {
    var self = this;

    var hashchange = function() {
      var path = location.hash.substr(1);
      if (get(self, 'lastSetURL') === path) { return; }

      set(self, 'lastSetURL', null);

      callback(location.hash.substr(1));
    };

    get(this, 'callbacks').pushObject(hashchange);
    window.addEventListener('hashchange', hashchange);
  },

  willDestroy: function() {
    get(this, 'callbacks').forEach(function(callback) {
      window.removeEventListener('hashchange', callback);
    });
    set(this, 'callbacks', null);
  }
});

/**
  Ember.Location returns an instance of the correct implementation of
  the `location` API.

  You can pass it a `style` ('hash', 'html5', 'none') to force a
  particular implementation.
*/
Ember.Location = {
  create: function(options) {
    var style = options && options.style;
    Ember.assert("you must provide a style to Ember.Location.create", !!style);

    if (style === "hash") {
      return Ember.HashLocation.create.apply(Ember.HashLocation, arguments);
    }
  }
};
