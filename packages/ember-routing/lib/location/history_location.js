import {
  get,
  set
} from 'ember-metal';

import { Object as EmberObject } from 'ember-runtime';
import EmberLocation from './api';

/**
@module ember
@submodule ember-routing
*/

let popstateFired = false;

function _uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r, v;
    r = Math.random() * 16 | 0;
    v = c === 'x' ? r : r & 3 | 8;
    return v.toString(16);
  });
}


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
    this._super(...arguments);

    let base = document.querySelector('base');
    let baseURL = '';
    if (base) {
      baseURL = base.getAttribute('href');
    }

    set(this, 'baseURL', baseURL);
    set(this, 'location', get(this, 'location') || window.location);

    this._popstateHandler = undefined;
  },

  /**
    Used to set state on first call to setURL

    @private
    @method initState
  */
  initState() {
    let history = get(this, 'history') || window.history;
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
    let location = get(this, 'location');
    let path = location.pathname;

    let rootURL = get(this, 'rootURL');
    let baseURL = get(this, 'baseURL');

    // remove trailing slashes if they exists
    rootURL = rootURL.replace(/\/$/, '');
    baseURL = baseURL.replace(/\/$/, '');

    // remove baseURL and rootURL from start of path
    let url = path
      .replace(new RegExp(`^${baseURL}(?=/|$)`), '')
      .replace(new RegExp(`^${rootURL}(?=/|$)`), '')
      .replace(/\/\/$/g,'/'); // remove extra slashes

    let search = location.search || '';
    url += search + this.getHash();

    return url;
  },

  /**
    Uses `history.pushState` to update the url without a page reload.

    @private
    @method setURL
    @param path {String}
  */
  setURL(path) {
    let state = this.getState();
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
    let state = this.getState();
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

    The object returned will contain a `path` for the given state as well
    as a unique state `id`. The state index will allow the app to distinguish
    between two states with similar paths but should be unique from one another.

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
    let state = { path, uuid: _uuid() };

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
    let state = { path, uuid: _uuid() };

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
    this._removeEventListener();

    this._popstateHandler = () => {
      // Ignore initial page load popstate event in Chrome
      if (!popstateFired) {
        popstateFired = true;
        if (this.getURL() === this._previousURL) { return; }
      }
      callback(this.getURL());
    };

    window.addEventListener('popstate', this._popstateHandler);
  },

  /**
    Used when using `{{action}}` helper.  The url is always appended to the rootURL.

    @private
    @method formatURL
    @param url {String}
    @return formatted url {String}
  */
  formatURL(url) {
    let rootURL = get(this, 'rootURL');
    let baseURL = get(this, 'baseURL');

    if (url !== '') {
      // remove trailing slashes if they exists
      rootURL = rootURL.replace(/\/$/, '');
      baseURL = baseURL.replace(/\/$/, '');
    } else if (baseURL[0] === '/' && rootURL[0] === '/') {
      // if baseURL and rootURL both start with a slash
      // ... remove trailing slash from baseURL if it exists
      baseURL = baseURL.replace(/\/$/, '');
    }

    // Sanitize double slashes in URL
    url = url.replace(/[/]{2,}/, '/');

    return baseURL + rootURL + url;
  },

  /**
    Cleans up the HistoryLocation event listener.

    @private
    @method willDestroy
  */
  willDestroy() {
    this._removeEventListener();
  },

  /**
    @private

    Returns normalized location.hash

    @method getHash
  */
  getHash: EmberLocation._getHash,

  _removeEventListener() {
    if (this._popstateHandler) {
      window.removeEventListener('popstate', this._popstateHandler);
    }
  }
});
