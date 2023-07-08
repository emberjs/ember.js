import EmberObject from '@ember/object';
import { assert } from '@ember/debug';
import type { default as EmberLocation, UpdateCallback } from '@ember/routing/location';

/**
@module @ember/routing/none-location
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
  updateCallback?: UpdateCallback;

  // Set in reopen so it can be overwritten with extend
  declare path: string;

  /**
    Will be pre-pended to path.

    @private
    @property rootURL
    @default '/'
  */
  // Set in reopen so it can be overwritten with extend
  declare rootURL: string;

  initState(): void {
    this._super(...arguments);

    let { rootURL } = this;

    // This assert doesn't have anything to do with state initialization,
    // but we're hijacking this method since it's called after the route has
    // set the rootURL property on its Location instance.
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
  getURL(): string {
    let { path, rootURL } = this;

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
  setURL(path: string): void {
    this.path = path;
  }

  /**
    Register a callback to be invoked when the path changes. These
    callbacks will execute when the user presses the back or forward
    button, but not after `setURL` is invoked.

    @private
    @method onUpdateURL
    @param callback {Function}
  */
  onUpdateURL(callback: (url: string) => void): void {
    this.updateCallback = callback;
  }

  /**
    Sets the path and calls the `updateURL` callback.

    @private
    @method handleURL
    @param url {String}
  */
  handleURL(url: string): void {
    this.path = url;
    if (this.updateCallback) {
      this.updateCallback(url);
    }
  }

  /**
    Given a URL, formats it to be placed into the page as part
    of an element's `href` attribute.

    This is used, for example, when using the {{action}} helper
    to generate a URL based on an event.

    @private
    @method formatURL
    @param {String} url
    @return {String} url
  */
  formatURL(url: string): string {
    let { rootURL } = this;

    if (url !== '') {
      // remove trailing slashes if they exists
      rootURL = rootURL.replace(/\/$/, '');
    }

    return rootURL + url;
  }
}

NoneLocation.reopen({
  path: '',
  rootURL: '/',
});
