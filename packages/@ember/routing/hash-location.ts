import EmberObject from '@ember/object/lib/ember-object';
import { PLAIN_FRAMEWORK_CLASS } from '@ember/-internals/container/lib/container';
import type Owner from '@ember/owner';
import { getOwner, setOwner } from '@ember/-internals/owner';
import { bind } from '@ember/runloop';
import type { default as EmberLocation, UpdateCallback } from '@ember/routing/location';
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
class HashLocation extends EmberObject implements EmberLocation {
  _hashchangeHandler?: EventListener;

  private _location?: Location;
  declare location: Location;

  init(): void {
    this.location = this._location ?? window.location;
    this._hashchangeHandler = undefined;
  }

  /**
    @private

    Returns normalized location.hash

    @since 1.5.1
    @method getHash
  */
  getHash(): string {
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
  getURL(): string {
    let originalPath = this.getHash().substring(1);
    let outPath = originalPath;

    if (outPath[0] !== '/') {
      outPath = '/';

      // Only add the # if the path isn't empty.
      // We do NOT want `/#` since the hash
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
  setURL(path: string): void {
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
  replaceURL(path: string): void {
    this.location.replace(`#${path}`);
    this.lastSetURL = path;
  }

  lastSetURL: string | null = null;

  /**
    Register a callback to be invoked when the hash changes. These
    callbacks will execute when the user presses the back or forward
    button, but not after `setURL` is invoked.

    @private
    @method onUpdateURL
    @param callback {Function}
  */
  onUpdateURL(callback: UpdateCallback): void {
    this._removeEventListener();
    this._hashchangeHandler = bind(this, function (this: HashLocation, _event: Event) {
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

    @private
    @method formatURL
    @param url {String}
  */
  formatURL(url: string): string {
    return `#${url}`;
  }

  /**
    Cleans up the HashLocation event listener.

    @private
    @method willDestroy
  */
  willDestroy(): void {
    this._removeEventListener();
  }

  _removeEventListener(): void {
    if (this._hashchangeHandler) {
      window.removeEventListener('hashchange', this._hashchangeHandler);
    }
  }
}

/**
  `HashLocation` when the `EMBER_DROP_CLASSIC_FEATURES` build flag is set. It
  extends no other class.
*/
class PlainHashLocation {
  static [PLAIN_FRAMEWORK_CLASS] = true;

  /** The container creates instances only through `create`. */
  static create<T extends PlainHashLocation>(this: new (owner?: Owner) => T, props?: object): T {
    return new this(props === undefined ? undefined : getOwner(props));
  }

  _hashchangeHandler?: EventListener;
  location: Location = window.location;
  lastSetURL: string | null = null;

  constructor(owner?: Owner) {
    if (owner !== undefined) {
      setOwner(this, owner);
    }
  }

  getHash(): string {
    return getHash(this.location);
  }

  getURL(): string {
    let originalPath = this.getHash().substring(1);
    let outPath = originalPath;

    if (outPath[0] !== '/') {
      outPath = '/';

      if (originalPath) {
        outPath += `#${originalPath}`;
      }
    }

    return outPath;
  }

  setURL(path: string): void {
    this.location.hash = path;
    this.lastSetURL = path;
  }

  replaceURL(path: string): void {
    this.location.replace(`#${path}`);
    this.lastSetURL = path;
  }

  onUpdateURL(callback: UpdateCallback): void {
    this._removeEventListener();

    this._hashchangeHandler = bind(this, function (this: PlainHashLocation, _event: Event) {
      let path = this.getURL();

      if (this.lastSetURL === path) {
        return;
      }

      this.lastSetURL = null;

      callback(path);
    });

    window.addEventListener('hashchange', this._hashchangeHandler);
  }

  formatURL(url: string): string {
    return `#${url}`;
  }

  willDestroy(): void {
    this._removeEventListener();
  }

  _removeEventListener(): void {
    if (this._hashchangeHandler) {
      window.removeEventListener('hashchange', this._hashchangeHandler);
    }
  }
}

const ExportedHashLocation = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? PlainHashLocation : HashLocation
) as typeof HashLocation;
type ExportedHashLocation = HashLocation;

export default ExportedHashLocation;
