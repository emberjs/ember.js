/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set;
var popstateFired = false;

/**
  Ember.HistoryLocation implements the location API using the browser's
  history.pushState API.

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

    Used to set state on first call to setURL

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
    @private

    Returns the current `location.pathname` without rootURL

    @method getURL
  */
  getURL: function() {
    var rootURL = get(this, 'rootURL'),
        url = get(this, 'location').pathname;

    rootURL = rootURL.replace(/\/$/, '');
    url = url.replace(rootURL, '');

    return url;
  },

  /**
    @private

    Uses `history.pushState` to update the url without a page reload.

    `history.state` is not supported in safari <6, so instead use
    get(this, 'location').pathname

    @method setURL
    @param path {String}
  */
  setURL: function(path) {
    path = this.formatURL(path);

    if(get(this, 'location').pathname !== path) { //if(this.getState() && this.getState().path !== path) {
      this.pushState(path);
    }
  },

  /**
    @private

    Uses `history.replaceState` to update the url without a page reload
    or history modification.

    `history.state` is not supported in safari <6, so instead use
    get(this, 'location').pathname

    @method replaceURL
    @param path {String}
  */
  replaceURL: function(path) {
    path = this.formatURL(path);

    if(get(this, 'location').pathname !== path) { //if (this.getState() && this.getState().path !== path) {
      this.replaceState(path);
    }
  },

  /**
   @private

   Pushes a new state

   @method pushState
   @param path {String}
  */
  pushState: function(path) {
    get(this, 'history').pushState({}, null, path);
    // used for webkit workaround
    this._previousURL = this.getURL();
  },

  /**
   @private

   Replaces the current state

   @method replaceState
   @param path {String}
  */
  replaceState: function(path) {
    get(this, 'history').replaceState({}, null, path);
    // used for webkit workaround
    this._previousURL = this.getURL();
  },

  /**
    @private

    Register a callback to be invoked whenever the browser
    history changes, including using forward and back buttons.

    @method onUpdateURL
    @param callback {Function}
  */
  onUpdateURL: function(callback) {
    var guid = Ember.guidFor(this),
        self = this;

    Ember.$(window).bind('popstate.ember-location-'+guid, function(e) {
      // Ignore initial page load popstate event in Chrome
      if(!popstateFired) {
        popstateFired = true;
        if (self.getURL() === self._previousURL) { return; }
      }
      callback(self.getURL());
    });
  },

  /**
    @private

    Used when using `{{action}}` helper.  The url is always appended to the rootURL.

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

    Ember.$(window).unbind('popstate.ember-location-'+guid);
  }
});

Ember.Location.registerImplementation('history', Ember.HistoryLocation);
