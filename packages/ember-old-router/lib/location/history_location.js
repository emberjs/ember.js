/**
@module ember
@submodule ember-old-router
*/

var get = Ember.get, set = Ember.set;
var popstateReady = false;

/**
  `Ember.HistoryLocation` implements the location API using the browser's
  `history.pushState` API.

  @class HistoryLocation
  @namespace Ember
  @extends Ember.Object
*/
Ember.HistoryLocation = Ember.Object.extend({

  init: function() {
    set(this, 'location', get(this, 'location') || window.location);
    this.initState();
  },

  /**
    @private

    Used to set state on first call to `setURL`

    @method initState
  */
  initState: function() {
    this.replaceState(get(this, 'location').pathname);
    set(this, 'history', window.history);
  },

  /**
    Will be pre-pended to path upon state change

    @property rootURL
    @default '/'
  */
  rootURL: '/',

  /**
    @private

    Returns the current `location.pathname`.

    @method getURL
  */
  getURL: function() {
    return get(this, 'location').pathname;
  },

  /**
    @private

    Uses `history.pushState` to update the url without a page reload.

    @method setURL
    @param path {String}
  */
  setURL: function(path) {
    path = this.formatURL(path);

    if (this.getState() && this.getState().path !== path) {
      popstateReady = true;
      this.pushState(path);
    }
  },

  /**
   @private

   Get the current `history.state`

   @method getState
  */
  getState: function() {
    return get(this, 'history').state;
  },

  /**
   @private

   Pushes a new state

   @method pushState
   @param path {String}
  */
  pushState: function(path) {
    window.history.pushState({ path: path }, null, path);
  },

  /**
   @private

   Replaces the current state

   @method replaceState
   @param path {String}
  */
  replaceState: function(path) {
    window.history.replaceState({ path: path }, null, path);
  },

  /**
    @private

    Register a callback to be invoked whenever the browser
    history changes, including using forward and back buttons.

    @method onUpdateURL
    @param callback {Function}
  */
  onUpdateURL: function(callback) {
    var guid = Ember.guidFor(this);

    Ember.$(window).on('popstate.ember-location-'+guid, function(e) {
      if (!popstateReady) {
        return;
      }
      callback(location.pathname);
    });
  },

  /**
    @private

    Used when using `{{action}}` helper. The url is always appended to the rootURL.

    @method formatURL
    @param url {String}
  */
  formatURL: function(url) {
    var rootURL = get(this, 'rootURL');

    if (url !== '') {
      rootURL = rootURL.replace(/\/$/, '');
    }

    return rootURL + url;
  },

  willDestroy: function() {
    var guid = Ember.guidFor(this);

    Ember.$(window).off('popstate.ember-location-'+guid);
  }
});

Ember.Location.registerImplementation('history', Ember.HistoryLocation);
