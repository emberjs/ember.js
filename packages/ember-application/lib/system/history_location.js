var get = Ember.get, set = Ember.set;

/**
  Ember.HistoryLocation implements the location API using the browser's
  history.pushState API.
*/
Ember.HistoryLocation = Ember.Object.extend({
  init: function() {
    set(this, 'location', get(this, 'location') || window.location);
    set(this, '_initialURL', get(this, 'location').pathname);
    set(this, 'callbacks', Ember.A());
  },

  /**
    @private

    Used to give history a starting reference
   */
  _initialURL: null,

  /**
    @private

    Returns the current `location.pathname`.
  */
  getURL: function() {
    return get(this, 'location').pathname;
  },

  /**
    @private

    Uses `history.pushState` to update the url without a page reload.
  */
  setURL: function(path) {
    var state = window.history.state,
        initialURL = get(this, '_initialURL');

    if (path === "") { path = '/'; }

    if ((initialURL && initialURL !== path) || (state && state.path !== path)) {
      set(this, '_initialURL', null);
      window.history.pushState({ path: path }, null, path);
    }
  },

  /**
    @private

    Register a callback to be invoked whenever the browser
    history changes, including using forward and back buttons.
  */
  onUpdateURL: function(callback) {
    var self = this;

    var popstate = function(e) {
      callback(location.pathname);
    };

    get(this, 'callbacks').pushObject(popstate);

    // This won't work on old browsers anyway, but this check prevents errors
    if (window.addEventListener) {
      window.addEventListener('popstate', popstate, false);
    }
  },

  /**
    @private

    Used when using {{action}} helper.  Since no formatting
    is required we just return the url given.
  */
  formatURL: function(url) {
    return url;
  },

  willDestroy: function() {
    get(this, 'callbacks').forEach(function(callback) {
      window.removeEventListener('popstate', callback, false);
    });
    set(this, 'callbacks', null);
  }
});

Ember.Location.registerImplementation('history', Ember.HistoryLocation);
