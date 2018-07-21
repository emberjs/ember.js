import { HAS_NATIVE_PROXY } from '@ember/-internals/utils';
import { assert, deprecate } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

export interface EmberLocation {
  implementation: string;
  cancelRouterSetup?: boolean;
  getURL(): string;
  setURL(url: string): void;
  replaceURL?(url: string): void;
  onUpdateURL(callback: UpdateCallback): void;
  formatURL(url: string): string;
  detect?(): void;
  initState?(): void;
}

export type UpdateCallback = (url: string) => void;
/**
@module @ember/routing
*/

/**
  Location returns an instance of the correct implementation of
  the `location` API.

  ## Implementations

  You can pass an implementation name (`hash`, `history`, `none`, `auto`) to force a
  particular implementation to be used in your application.

  See [HashLocation](/api/ember/release/classes/HashLocation).
  See [HistoryLocation](/api/ember/release/classes/HistoryLocation).
  See [NoneLocation](/api/ember/release/classes/NoneLocation).
  See [AutoLocation](/api/ember/release/classes/AutoLocation).

  ## Location API

  Each location implementation must provide the following methods:

  * implementation: returns the string name used to reference the implementation.
  * getURL: returns the current URL.
  * setURL(path): sets the current URL.
  * replaceURL(path): replace the current URL (optional).
  * onUpdateURL(callback): triggers the callback when the URL changes.
  * formatURL(url): formats `url` to be placed into `href` attribute.
  * detect() (optional): instructs the location to do any feature detection
      necessary. If the location needs to redirect to a different URL, it
      can cancel routing by setting the `cancelRouterSetup` property on itself
      to `false`.

  Calling setURL or replaceURL will not trigger onUpdateURL callbacks.

  ## Custom implementation

  Ember scans `app/locations/*` for extending the Location API.

  Example:

  ```javascript
  import HistoryLocation from '@ember/routing/history-location';

  export default class MyHistory {
    implementation: 'my-custom-history',
    constructor() {
      this._history = HistoryLocation.create(...arguments);
    }
    create() {
      return new this(...arguments);
    }
    pushState(path) {
       this._history.pushState(path);
    }
  }
  ```

  @class Location
  @private
*/
const Location = {
  /**
   This is deprecated in favor of using the container to lookup the location
   implementation as desired.

   For example:

   ```javascript
   // Given a location registered as follows:
   container.register('location:history-test', HistoryTestLocation);

   // You could create a new instance via:
   container.lookup('location:history-test');
   ```

    @method create
    @param {Object} options
    @return {Object} an instance of an implementation of the `location` API
    @deprecated Use the container to lookup the location implementation that you
    need.
    @private
  */
  create(options: { implementation: string }): EmberLocation {
    deprecate(
      `\`Location.create\` is deprecated, use the \`container\` to register and lookup the location implementation that you need`,
      false,
      { id: 'ember-routing.location-create', until: '3.9.0' }
    );
    let implementation = options && options.implementation;
    assert("Location.create: you must specify a 'implementation' option", Boolean(implementation));

    let implementationClass = this.implementations[implementation];
    assert(
      `Location.create: ${implementation} is not a valid implementation`,
      Boolean(implementationClass)
    );

    return implementationClass.create(...arguments);
  },

  _implementations: {},
};

if (DEBUG && HAS_NATIVE_PROXY) {
  /* globals Proxy Reflect */
  Location._implementations = new Proxy(
    {},
    {
      set() {
        deprecate(
          `\`Location.implementations\` is deprecated, use the \`container\` to register and lookup the location implementation that you need`,
          false,
          { id: 'ember-routing.location-create', until: '3.9.0' }
        );
        return Reflect.set(...arguments);
      },
    }
  );
}

Object.defineProperty(Location, 'implementations', {
  set: function(val) {
    deprecate(
      `\`Location.implementations\` is deprecated, use the \`container\` to register and lookup the location implementation that you need`,
      false,
      { id: 'ember-routing.location-create', until: '3.9.0' }
    );
    this._implementations = val;
  },
  get: function() {
    deprecate(
      `\`Location.implementations\` is deprecated, use the \`container\` to register and lookup the location implementation that you need`,
      false,
      { id: 'ember-routing.location-create', until: '3.9.0' }
    );
    return this._implementations;
  },
});

export default Location;
