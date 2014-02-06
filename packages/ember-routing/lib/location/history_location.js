/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set;
var popstateFired = false;
var supportsHistoryState = window.history && 'state' in window.history;

/**
  Ember.HistoryLocation implements the location API using the browser's
  history.pushState API.

  @class HistoryLocation
  @namespace Ember
  @extends Ember.Object
*/
Ember.HistoryLocation = Ember.Object.extend({
  implementation: 'history',

  init: function() {
    set(this, 'location', get(this, 'location') || window.location);
    set(this, 'baseURL', Ember.$('base').attr('href') || '');
  },

  /**
    Used to set state on first call to setURL

    @private
    @method initState
  */
  initState: function() {
    set(this, 'history', get(this, 'history') || window.history);
    this.replaceState(this.formatURL(this.getURL()));
  },

  /**
    Will be pre-pended to path upon state change

    @property rootURL
    @default '/'
  */
  rootURL: '/',

  /**
    Returns the current `location.pathname` without `rootURL`.

    @private
    @method getURL
    @return url {String}
  */
  getURL: function() {
    var rootURL = get(this, 'rootURL'),
        location = get(this, 'location'),
        path = location.pathname,
        baseURL = get(this, 'baseURL');

    rootURL = rootURL.replace(/\/$/, '');
    baseURL = baseURL.replace(/\/$/, '');
    var url = path.replace(baseURL, '').replace(rootURL, '');

    if (Ember.FEATURES.isEnabled("query-params-new")) {
      var search = location.search || '';
      url += search;
    }

    return url;
  },

  /**
    Uses `history.pushState` to update the url without a page reload.

    @private
    @method setURL
    @param path {String}
  */
  setURL: function(path) {
    var state = this.getState();
    path = this.formatURL(path);

    var gotState = (state !== null) && (typeof state !== 'undefined');

    if (((gotState === true) && (state.path !== path)) || (gotState === false)) {
      this.pushState(path);
    }
  },

  /**
    Uses `history.replaceState` to update the url without a page reload
    or history modification.

    @private
    @method replaceURL
    @param path {String}
  */
  replaceURL: function(path) {
    var state = this.getState();
    path = this.formatURL(path);

    var gotState = (state !== null) && (typeof state !== 'undefined');

    if (((gotState === true) && (state.path !== path)) || (gotState === false)) {
      this.replaceState(path);
    }
  },

  /**
   Get the current `history.state`
   Polyfill checks for native browser support and falls back to retrieving
   from a private _historyState variable

   @private
   @method getState
   @return state {Object}
  */
  getState: function() {
    return supportsHistoryState ? get(this, 'history').state : this._historyState;
  },

  /**
   Pushes a new state.

   @private
   @method pushState
   @param path {String}
  */
  pushState: function(path) {
    var state = { path: path };

    get(this, 'history').pushState(state, null, path);

    // store state if browser doesn't support `history.state`
    if (!supportsHistoryState) {
      this._historyState = state;
    }

    // used for webkit workaround
    this._previousURL = this.getURL();
  },

  /**
   Replaces the current state.

   @private
   @method replaceState
   @param path {String}
  */
  replaceState: function(path) {
    var state = { path: path };

    get(this, 'history').replaceState(state, null, path);

    // store state if browser doesn't support `history.state`
    if (!supportsHistoryState) {
      this._historyState = state;
    }

    // used for webkit workaround
    this._previousURL = this.getURL();
  },

  /**
    Register a callback to be invoked whenever the browser
    history changes, including using forward and back buttons.

    @private
    @method onUpdateURL
    @param callback {Function}
  */
  onUpdateURL: function(callback) {
    var guid = Ember.guidFor(this),
        self = this;

    Ember.$(window).on('popstate.ember-location-'+guid, function(e) {
      // Ignore initial page load popstate event in Chrome
      if (!popstateFired) {
        popstateFired = true;
        if (self.getURL() === self._previousURL) { return; }
      }
      callback(self.getURL());
    });
  },

  /**
    Used when using `{{action}}` helper.  The url is always appended to the rootURL.

    @private
    @method formatURL
    @param url {String}
    @return formatted url {String}
  */
  formatURL: function(url) {
    var rootURL = get(this, 'rootURL'),
        baseURL = get(this, 'baseURL');

    if (url !== '') {
      rootURL = rootURL.replace(/\/$/, '');
      baseURL = baseURL.replace(/\/$/, '');
    } else if(baseURL.match(/^\//) && rootURL.match(/^\//)) {
      baseURL = baseURL.replace(/\/$/, '');
    }

    return baseURL + rootURL + url;
  },

  /**
    Cleans up the HistoryLocation event listener.

    @private
    @method willDestroy
  */
  willDestroy: function() {
    var guid = Ember.guidFor(this);

    Ember.$(window).off('popstate.ember-location-'+guid);
  }
});
