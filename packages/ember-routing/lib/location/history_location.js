import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import { guidFor } from "ember-metal/utils";

import EmberObject from "ember-runtime/system/object";
import EmberLocation from "ember-routing/location/api";
import jQuery from "ember-views/system/jquery";

/**
@module ember
@submodule ember-routing
*/

var popstateFired = false;

/**
  Ember.HistoryLocation implements the location API using the browser's
  history.pushState API.

  @class HistoryLocation
  @namespace Ember
  @extends Ember.Object
*/
export default EmberObject.extend({
  implementation: 'history',

  init: function() {
    set(this, 'location', get(this, 'location') || window.location);
    set(this, 'baseURL', jQuery('base').attr('href') || '');
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
    Returns the current `location.pathname` without `rootURL` or `baseURL`

    @private
    @method getURL
    @return url {String}
  */
  getURL: function() {
    var rootURL = get(this, 'rootURL');
    var location = get(this, 'location');
    var path = location.pathname;
    var baseURL = get(this, 'baseURL');

    rootURL = rootURL.replace(/\/$/, '');
    baseURL = baseURL.replace(/\/$/, '');

    var url = path.replace(baseURL, '').replace(rootURL, '');
    var search = location.search || '';

    url += search;
    url += this.getHash();

    return url;
  },

  /**
    Uses `history.pushState` to update the url without a page reload.

    @private
    @method setURL
    @param path {String}
  */
  setURL: function(path) {
    var state = this._historyState;
    path = this.formatURL(path);

    if (!state || state.path !== path) {
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
    var state = this._historyState;
    path = this.formatURL(path);

    if (!state || state.path !== path) {
      this.replaceState(path);
    }
  },

  /**
   Pushes a new state.

   @private
   @method pushState
   @param path {String}
  */
  pushState: function(path) {
    var state = { path: path };

    get(this, 'history').pushState(null, null, path);

    this._historyState = state;

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
    get(this, 'history').replaceState(null, null, path);

    this._historyState = state;

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
    var guid = guidFor(this);
    var self = this;

    jQuery(window).on('popstate.ember-location-'+guid, function(e) {
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
    var rootURL = get(this, 'rootURL');
    var baseURL = get(this, 'baseURL');

    if (url !== '') {
      rootURL = rootURL.replace(/\/$/, '');
      baseURL = baseURL.replace(/\/$/, '');
    } else if (baseURL.match(/^\//) && rootURL.match(/^\//)) {
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
    var guid = guidFor(this);

    jQuery(window).off('popstate.ember-location-'+guid);
  },

  /**
    @private

    Returns normalized location.hash

    @method getHash
  */
  getHash: EmberLocation._getHash
});
