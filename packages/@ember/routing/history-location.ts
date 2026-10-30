import EmberObject from '@ember/object/lib/ember-object';
import { PLAIN_FRAMEWORK_CLASS } from '@ember/-internals/container/lib/container';
import type Owner from '@ember/owner';
import { getOwner, setOwner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import type { default as EmberLocation, UpdateCallback } from '@ember/routing/location';
import { escapeRegExp, getHash } from './lib/location-utils';

/**
@module @ember/routing/history-location
*/

function _uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    let r, v;
    r = (Math.random() * 16) | 0;
    v = c === 'x' ? r : (r & 3) | 8;
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
class HistoryLocation extends EmberObject implements EmberLocation {
  // SAFETY: both of these properties initialized via `init`.
  declare location: Location;
  declare baseURL: string;

  history?: Window['history'];

  _popstateHandler?: EventListener;

  /**
    Will be pre-pended to path upon state change

    @property rootURL
    @default '/'
    @private
  */
  rootURL = '/';

  /**
    @private

    Returns normalized location.hash

    @method getHash
  */
  getHash(): string {
    return getHash(this.location);
  }

  init(): void {
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
  initState(): void {
    let history = this.history ?? window.history;
    this.history = history;

    let { state } = history;
    let path = this.formatURL(this.getURL());
    if (!state || state.path !== path) {
      this.replaceState(path);
    }
  }

  /**
    Returns the current `location.pathname` without `rootURL` or `baseURL`

    @private
    @method getURL
    @return url {String}
  */
  getURL(): string {
    let { location, rootURL, baseURL } = this;
    let path = location.pathname;

    // remove trailing slashes if they exists
    rootURL = rootURL.replace(/\/$/, '');
    baseURL = baseURL.replace(/\/$/, '');

    // remove baseURL and rootURL from start of path
    let url = path
      .replace(new RegExp(`^${escapeRegExp(baseURL)}(?=/|$)`), '')
      .replace(new RegExp(`^${escapeRegExp(rootURL)}(?=/|$)`), '')
      .replace(/\/\//g, '/'); // remove extra slashes

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
  setURL(path: string): void {
    assert('HistoryLocation.history is unexpectedly missing', this.history);
    let { state } = this.history;
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
  replaceURL(path: string): void {
    assert('HistoryLocation.history is unexpectedly missing', this.history);
    let { state } = this.history;
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
  pushState(path: string): void {
    let state = { path, uuid: _uuid() };

    assert('HistoryLocation.history is unexpectedly missing', this.history);
    this.history.pushState(state, '', path);
  }

  /**
   Replaces the current state.

   @private
   @method replaceState
   @param path {String}
  */
  replaceState(path: string): void {
    let state = { path, uuid: _uuid() };

    assert('HistoryLocation.history is unexpectedly missing', this.history);
    this.history.replaceState(state, '', path);
  }

  /**
    Register a callback to be invoked whenever the browser
    history changes, including using forward and back buttons.

    @private
    @method onUpdateURL
    @param callback {Function}
  */
  onUpdateURL(callback: UpdateCallback): void {
    this._removeEventListener();

    this._popstateHandler = () => {
      callback(this.getURL());
    };

    window.addEventListener('popstate', this._popstateHandler);
  }

  /**
    Formats url to be placed into href attribute.

    @private
    @method formatURL
    @param url {String}
    @return formatted url {String}
  */
  formatURL(url: string): string {
    let { rootURL, baseURL } = this;

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
  willDestroy(): void {
    this._removeEventListener();
  }

  _removeEventListener(): void {
    if (this._popstateHandler) {
      window.removeEventListener('popstate', this._popstateHandler);
    }
  }
}

function baseURLFromDocument(): string {
  let base = document.querySelector('base');

  if (base !== null && base.hasAttribute('href')) {
    return base.getAttribute('href') ?? '';
  }

  return '';
}

/**
  `HistoryLocation` when the `EMBER_DROP_CLASSIC_FEATURES` build flag is set.
  It extends no other class.
*/
class PlainHistoryLocation {
  static [PLAIN_FRAMEWORK_CLASS] = true;

  /** The container creates instances only through `create`. */
  static create<T extends PlainHistoryLocation>(this: new (owner?: Owner) => T, props?: object): T {
    return new this(props === undefined ? undefined : getOwner(props));
  }

  location: Location = window.location;
  baseURL: string = baseURLFromDocument();
  history?: Window['history'];
  _popstateHandler?: EventListener;
  rootURL = '/';

  constructor(owner?: Owner) {
    if (owner !== undefined) {
      setOwner(this, owner);
    }
  }

  getHash(): string {
    return getHash(this.location);
  }

  initState(): void {
    let history = this.history ?? window.history;
    this.history = history;

    let { state } = history;
    let path = this.formatURL(this.getURL());

    if (!state || state.path !== path) {
      this.replaceState(path);
    }
  }

  getURL(): string {
    let { location, rootURL, baseURL } = this;
    let path = location.pathname;

    rootURL = rootURL.replace(/\/$/, '');
    baseURL = baseURL.replace(/\/$/, '');

    let url = path
      .replace(new RegExp(`^${escapeRegExp(baseURL)}(?=/|$)`), '')
      .replace(new RegExp(`^${escapeRegExp(rootURL)}(?=/|$)`), '')
      .replace(/\/\//g, '/');

    let search = location.search || '';
    url += search + this.getHash();

    return url;
  }

  setURL(path: string): void {
    assert('HistoryLocation.history is unexpectedly missing', this.history);

    let { state } = this.history;
    path = this.formatURL(path);

    if (!state || state.path !== path) {
      this.pushState(path);
    }
  }

  replaceURL(path: string): void {
    assert('HistoryLocation.history is unexpectedly missing', this.history);

    let { state } = this.history;
    path = this.formatURL(path);

    if (!state || state.path !== path) {
      this.replaceState(path);
    }
  }

  pushState(path: string): void {
    let state = { path, uuid: _uuid() };

    assert('HistoryLocation.history is unexpectedly missing', this.history);
    this.history.pushState(state, '', path);
  }

  replaceState(path: string): void {
    let state = { path, uuid: _uuid() };

    assert('HistoryLocation.history is unexpectedly missing', this.history);
    this.history.replaceState(state, '', path);
  }

  onUpdateURL(callback: UpdateCallback): void {
    this._removeEventListener();

    this._popstateHandler = () => {
      callback(this.getURL());
    };

    window.addEventListener('popstate', this._popstateHandler);
  }

  formatURL(url: string): string {
    let { rootURL, baseURL } = this;

    if (url !== '') {
      rootURL = rootURL.replace(/\/$/, '');
      baseURL = baseURL.replace(/\/$/, '');
    } else if (baseURL[0] === '/' && rootURL[0] === '/') {
      baseURL = baseURL.replace(/\/$/, '');
    }

    return baseURL + rootURL + url;
  }

  willDestroy(): void {
    this._removeEventListener();
  }

  _removeEventListener(): void {
    if (this._popstateHandler) {
      window.removeEventListener('popstate', this._popstateHandler);
    }
  }
}

const ExportedHistoryLocation = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? PlainHistoryLocation : HistoryLocation
) as typeof HistoryLocation;
type ExportedHistoryLocation = HistoryLocation;

export default ExportedHistoryLocation;
