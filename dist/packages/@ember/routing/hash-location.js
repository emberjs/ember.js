import EmberObject from '@ember/object';
import { bind } from '@ember/runloop';
import { getHash } from './lib/location-utils';
/**
@module @ember/routing/hash-location
*/
/**
  `HashLocation` implements the location API using the browser's
  hash. At present, it relies on a `hashchange` event existing in the
  browser.

  Using `HashLocation` results in URLs with a `#` (hash sign) separating the
  server side URL portion of the URL from the portion that is used by Ember.

  Example:

  ```app/router.js
  Router.map(function() {
    this.route('posts', function() {
      this.route('new');
    });
  });

  Router.reopen({
    location: 'hash'
  });
  ```

  This will result in a posts.new url of `/#/posts/new`.

  @class HashLocation
  @extends EmberObject
  @protected
*/
export default class HashLocation extends EmberObject {
  constructor() {
    super(...arguments);
    this.lastSetURL = null;
  }
  init() {
    this.location = this._location ?? window.location;
    this._hashchangeHandler = undefined;
  }
  /**
    @private
       Returns normalized location.hash
       @since 1.5.1
    @method getHash
  */
  getHash() {
    return getHash(this.location);
  }
  /**
    Returns the normalized URL, constructed from `location.hash`.
       e.g. `#/foo` => `/foo` as well as `#/foo#bar` => `/foo#bar`.
       By convention, hashed paths must begin with a forward slash, otherwise they
    are not treated as a path so we can distinguish intent.
       @private
    @method getURL
  */
  getURL() {
    let originalPath = this.getHash().substring(1);
    let outPath = originalPath;
    if (outPath[0] !== '/') {
      outPath = '/';
      // Only add the # if the path isn't empty.
      // We do NOT want `/#` since the ampersand
      // is only included (conventionally) when
      // the location.hash has a value
      if (originalPath) {
        outPath += `#${originalPath}`;
      }
    }
    return outPath;
  }
  /**
    Set the `location.hash` and remembers what was set. This prevents
    `onUpdateURL` callbacks from triggering when the hash was set by
    `HashLocation`.
       @private
    @method setURL
    @param path {String}
  */
  setURL(path) {
    this.location.hash = path;
    this.lastSetURL = path;
  }
  /**
    Uses location.replace to update the url without a page reload
    or history modification.
       @private
    @method replaceURL
    @param path {String}
  */
  replaceURL(path) {
    this.location.replace(`#${path}`);
    this.lastSetURL = path;
  }
  /**
    Register a callback to be invoked when the hash changes. These
    callbacks will execute when the user presses the back or forward
    button, but not after `setURL` is invoked.
       @private
    @method onUpdateURL
    @param callback {Function}
  */
  onUpdateURL(callback) {
    this._removeEventListener();
    this._hashchangeHandler = bind(this, function (_event) {
      let path = this.getURL();
      if (this.lastSetURL === path) {
        return;
      }
      this.lastSetURL = null;
      callback(path);
    });
    window.addEventListener('hashchange', this._hashchangeHandler);
  }
  /**
    Given a URL, formats it to be placed into the page as part
    of an element's `href` attribute.
       This is used, for example, when using the {{action}} helper
    to generate a URL based on an event.
       @private
    @method formatURL
    @param url {String}
  */
  formatURL(url) {
    return `#${url}`;
  }
  /**
    Cleans up the HashLocation event listener.
       @private
    @method willDestroy
  */
  willDestroy() {
    this._removeEventListener();
  }
  _removeEventListener() {
    if (this._hashchangeHandler) {
      window.removeEventListener('hashchange', this._hashchangeHandler);
    }
  }
}