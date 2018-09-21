import { get, set } from '@ember/-internals/metal';
import { Object as EmberObject } from '@ember/-internals/runtime';
import { assert } from '@ember/debug';
import { EmberLocation, UpdateCallback } from './api';

/**
@module @ember/routing
*/

/**
  NoneLocation does not interact with the browser. It is useful for
  testing, or when you need to manage state with your Router, but temporarily
  don't want it to muck with the URL (for example when you embed your
  application in a larger page).

  Using `NoneLocation` causes Ember to not store the applications URL state
  in the actual URL. This is generally used for testing purposes, and is one
  of the changes made when calling `App.setupForTesting()`.

  @class NoneLocation
  @extends EmberObject
  @protected
*/
export default class NoneLocation extends EmberObject implements EmberLocation {
  updateCallback!: UpdateCallback;
  implementation = 'none';

  detect() {
    let rootURL = this.rootURL;

    assert(
      'rootURL must end with a trailing forward slash e.g. "/app/"',
      rootURL.charAt(rootURL.length - 1) === '/'
    );
  }

  /**
    Returns the current path without `rootURL`.

    @private
    @method getURL
    @return {String} path
  */
  getURL() {
    let path = get(this, 'path');
    let rootURL = get(this, 'rootURL');

    // remove trailing slashes if they exists
    rootURL = rootURL.replace(/\/$/, '');

    // remove rootURL from url
    return path.replace(new RegExp(`^${rootURL}(?=/|$)`), '');
  }

  /**
    Set the path and remembers what was set. Using this method
    to change the path will not invoke the `updateURL` callback.

    @private
    @method setURL
    @param path {String}
  */
  setURL(path: string) {
    set(this, 'path', path);
  }

  /**
    Register a callback to be invoked when the path changes. These
    callbacks will execute when the user presses the back or forward
    button, but not after `setURL` is invoked.

    @private
    @method onUpdateURL
    @param callback {Function}
  */
  onUpdateURL(callback: (url: string) => void) {
    this.updateCallback = callback;
  }

  /**
    Sets the path and calls the `updateURL` callback.

    @private
    @method handleURL
    @param url {String}
  */
  handleURL(url: string) {
    set(this, 'path', url);
    this.updateCallback(url);
  }

  /**
    Given a URL, formats it to be placed into the page as part
    of an element's `href` attribute.

    This is used, for example, when using the {{action}} helper
    to generate a URL based on an event.

    @private
    @method formatURL
    @param url {String}
    @return {String} url
  */
  formatURL(url: string) {
    let rootURL = get(this, 'rootURL');

    if (url !== '') {
      // remove trailing slashes if they exists
      rootURL = rootURL.replace(/\/$/, '');
    }

    return rootURL + url;
  }
}

NoneLocation.reopen({
  path: '',

  /**
    Will be pre-pended to path.

    @private
    @property rootURL
    @default '/'
  */
  rootURL: '/',
});
