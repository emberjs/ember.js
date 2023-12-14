import EmberObject from '@ember/object';
import { assert } from '@ember/debug';
import { getHash } from './lib/location-utils';
/**
@module @ember/routing/history-location
*/
let popstateFired = false;
function _uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    let r, v;
    r = Math.random() * 16 | 0;
    v = c === 'x' ? r : r & 3 | 8;
    return v.toString(16);
  });
}
/**
  HistoryLocation implements the location API using the browser's
  history.pushState API.

  Using `HistoryLocation` results in URLs that are indistinguishable from a
  standard URL. This relies upon the browser's `history` API.

  Example:

  ```app/router.js
  Router.map(function() {
    this.route('posts', function() {
      this.route('new');
    });
  });

  Router.reopen({
    location: 'history'
  });
  ```

  This will result in a posts.new url of `/posts/new`.

  Keep in mind that your server must serve the Ember app at all the routes you
  define.

  Using `HistoryLocation` will also result in location states being recorded by
  the browser `history` API with the following schema:

  ```
  window.history.state -> { path: '/', uuid: '3552e730-b4a6-46bd-b8bf-d8c3c1a97e0a' }
  ```

  This allows each in-app location state to be tracked uniquely across history
  state changes via the `uuid` field.

  @class HistoryLocation
  @extends EmberObject
  @protected
*/
export default class HistoryLocation extends EmberObject {
  constructor() {
    super(...arguments);
    /**
      Will be pre-pended to path upon state change
             @property rootURL
      @default '/'
      @private
    */
    this.rootURL = '/';
  }
  /**
    @private
       Returns normalized location.hash
       @method getHash
  */
  getHash() {
    return getHash(this.location);
  }
  init() {
    this._super(...arguments);
    let base = document.querySelector('base');
    let baseURL = '';
    if (base !== null && base.hasAttribute('href')) {
      baseURL = base.getAttribute('href') ?? '';
    }
    this.baseURL = baseURL;
    this.location = this.location ?? window.location;
    this._popstateHandler = undefined;
  }
  /**
    Used to set state on first call to setURL
       @private
    @method initState
  */
  initState() {
    let history = this.history ?? window.history;
    this.history = history;
    let {
      state
    } = history;
    let path = this.formatURL(this.getURL());
    if (state && state.path === path) {
      // preserve existing state
      // used for webkit workaround, since there will be no initial popstate event
      this._previousURL = this.getURL();
    } else {
      this.replaceState(path);
    }
  }
  /**
    Returns the current `location.pathname` without `rootURL` or `baseURL`
       @private
    @method getURL
    @return url {String}
  */
  getURL() {
    let {
      location,
      rootURL,
      baseURL
    } = this;
    let path = location.pathname;
    // remove trailing slashes if they exists
    rootURL = rootURL.replace(/\/$/, '');
    baseURL = baseURL.replace(/\/$/, '');
    // remove baseURL and rootURL from start of path
    let url = path.replace(new RegExp(`^${baseURL}(?=/|$)`), '').replace(new RegExp(`^${rootURL}(?=/|$)`), '').replace(/\/\//g, '/'); // remove extra slashes
    let search = location.search || '';
    url += search + this.getHash();
    return url;
  }
  /**
    Uses `history.pushState` to update the url without a page reload.
       @private
    @method setURL
    @param path {String}
  */
  setURL(path) {
    assert('HistoryLocation.history is unexpectedly missing', this.history);
    let {
      state
    } = this.history;
    path = this.formatURL(path);
    if (!state || state.path !== path) {
      this.pushState(path);
    }
  }
  /**
    Uses `history.replaceState` to update the url without a page reload
    or history modification.
       @private
    @method replaceURL
    @param path {String}
  */
  replaceURL(path) {
    assert('HistoryLocation.history is unexpectedly missing', this.history);
    let {
      state
    } = this.history;
    path = this.formatURL(path);
    if (!state || state.path !== path) {
      this.replaceState(path);
    }
  }
  /**
   Pushes a new state.
      @private
   @method pushState
   @param path {String}
  */
  pushState(path) {
    let state = {
      path,
      uuid: _uuid()
    };
    assert('HistoryLocation.history is unexpectedly missing', this.history);
    this.history.pushState(state, '', path);
    // used for webkit workaround
    this._previousURL = this.getURL();
  }
  /**
   Replaces the current state.
      @private
   @method replaceState
   @param path {String}
  */
  replaceState(path) {
    let state = {
      path,
      uuid: _uuid()
    };
    assert('HistoryLocation.history is unexpectedly missing', this.history);
    this.history.replaceState(state, '', path);
    // used for webkit workaround
    this._previousURL = this.getURL();
  }
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
        if (this.getURL() === this._previousURL) {
          return;
        }
      }
      callback(this.getURL());
    };
    window.addEventListener('popstate', this._popstateHandler);
  }
  /**
    Used when using `{{action}}` helper.  The url is always appended to the rootURL.
       @private
    @method formatURL
    @param url {String}
    @return formatted url {String}
  */
  formatURL(url) {
    let {
      rootURL,
      baseURL
    } = this;
    if (url !== '') {
      // remove trailing slashes if they exists
      rootURL = rootURL.replace(/\/$/, '');
      baseURL = baseURL.replace(/\/$/, '');
    } else if (baseURL[0] === '/' && rootURL[0] === '/') {
      // if baseURL and rootURL both start with a slash
      // ... remove trailing slash from baseURL if it exists
      baseURL = baseURL.replace(/\/$/, '');
    }
    return baseURL + rootURL + url;
  }
  /**
    Cleans up the HistoryLocation event listener.
       @private
    @method willDestroy
  */
  willDestroy() {
    this._removeEventListener();
  }
  _removeEventListener() {
    if (this._popstateHandler) {
      window.removeEventListener('popstate', this._popstateHandler);
    }
  }
}