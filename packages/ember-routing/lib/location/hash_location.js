import {
  get,
  set,
  run
} from 'ember-metal';

import { Object as EmberObject } from 'ember-runtime';
import EmberLocation from './api';

/**
@module ember
@submodule ember-routing
*/

/**
  `Ember.HashLocation` implements the location API using the browser's
  hash. At present, it relies on a `hashchange` event existing in the
  browser.

  @class HashLocation
  @namespace Ember
  @extends Ember.Object
  @private
*/
export default EmberObject.extend({
  implementation: 'hash',

  init() {
    set(this, 'location', get(this, '_location') || window.location);

    this._hashchangeHandler = undefined;
  },

  /**
    @private

    Returns normalized location.hash

    @since 1.5.1
    @method getHash
  */
  getHash: EmberLocation._getHash,

  /**
    Returns the normalized URL, constructed from `location.hash`.

    e.g. `#/foo` => `/foo` as well as `#/foo#bar` => `/foo#bar`.

    By convention, hashed paths must begin with a forward slash, otherwise they
    are not treated as a path so we can distinguish intent.

    @private
    @method getURL
  */
  getURL() {
    let originalPath = this.getHash().substr(1);
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
  },

  /**
    Set the `location.hash` and remembers what was set. This prevents
    `onUpdateURL` callbacks from triggering when the hash was set by
    `HashLocation`.

    @private
    @method setURL
    @param path {String}
  */
  setURL(path) {
    get(this, 'location').hash = path;
    set(this, 'lastSetURL', path);
  },

  /**
    Uses location.replace to update the url without a page reload
    or history modification.

    @private
    @method replaceURL
    @param path {String}
  */
  replaceURL(path) {
    get(this, 'location').replace(`#${path}`);
    set(this, 'lastSetURL', path);
  },

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

    this._hashchangeHandler = () => {
      run(() => {
        let path = this.getURL();
        if (get(this, 'lastSetURL') === path) { return; }

        set(this, 'lastSetURL', null);

        callback(path);
      });
    };

    window.addEventListener('hashchange', this._hashchangeHandler);
  },

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
  },

  /**
    Cleans up the HashLocation event listener.

    @private
    @method willDestroy
  */
  willDestroy() {
    this._removeEventListener();
  },

  _removeEventListener() {
    if (this._hashchangeHandler) {
      window.removeEventListener('hashchange', this._hashchangeHandler);
    }
  }
});
