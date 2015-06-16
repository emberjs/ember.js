import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import { guidFor } from 'ember-metal/utils';

import EmberObject from 'ember-runtime/system/object';
import EmberLocation from 'ember-routing/location/api';
import jQuery from 'ember-views/system/jquery';

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
  @private
*/
export default EmberObject.extend({
  implementation: 'history',

  init() {
    set(this, 'location', get(this, 'location') || window.location);
    set(this, 'baseURL', jQuery('base').attr('href') || '');

  },

  /**
    Used to set state on first call to setURL

    @private
    @method initState
  */
  initState() {
    var history = get(this, 'history') || window.history;
    set(this, 'history', history);

    if (history && 'state' in history) {
      this.supportsHistory = true;
    }

    this.replaceState(this.formatURL(this.getURL()));
  },

  /**
    Will be pre-pended to path upon state change

    @property rootURL
    @default '/'
    @private
  */
  rootURL: '/',

  /**
    Returns the current `location.pathname` without `rootURL` or `baseURL`

    @private
    @method getURL
    @return url {String}
  */
  getURL() {
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
  setURL(path) {
    var state = this.getState();
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
  replaceURL(path) {
    var state = this.getState();
    path = this.formatURL(path);

    if (!state || state.path !== path) {
      this.replaceState(path);
    }
  },

  /**
    Get the current `history.state`. Checks for if a polyfill is
    required and if so fetches this._historyState. The state returned
    from getState may be null if an iframe has changed a window's
    history.

    @private
    @method getState
    @return state {Object}
  */
  getState() {
    if (this.supportsHistory) {
      return get(this, 'history').state;
    }

    return this._historyState;
  },

  /**
   Pushes a new state.

   @private
   @method pushState
   @param path {String}
  */
  pushState(path) {
    var state = { path: path };

    get(this, 'history').pushState(state, null, path);

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
  replaceState(path) {
    var state = { path: path };
    get(this, 'history').replaceState(state, null, path);

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
  onUpdateURL(callback) {
    var guid = guidFor(this);

    jQuery(window).on(`popstate.ember-location-${guid}`, (e) => {
      // Ignore initial page load popstate event in Chrome
      if (!popstateFired) {
        popstateFired = true;
        if (this.getURL() === this._previousURL) { return; }
      }
      callback(this.getURL());
    });
  },

  /**
    Used when using `{{action}}` helper.  The url is always appended to the rootURL.

    @private
    @method formatURL
    @param url {String}
    @return formatted url {String}
  */
  formatURL(url) {
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
  willDestroy() {
    var guid = guidFor(this);

    jQuery(window).off(`popstate.ember-location-${guid}`);
  },

  /**
    @private

    Returns normalized location.hash

    @method getHash
  */
  getHash: EmberLocation._getHash
});
