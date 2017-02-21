import { assert } from 'ember-debug';
import { environment } from 'ember-environment';
import { getHash } from './util';

/**
@module ember
@submodule ember-routing
*/

/**
  Ember.Location returns an instance of the correct implementation of
  the `location` API.

  ## Implementations

  You can pass an implementation name (`hash`, `history`, `none`, `auto`) to force a
  particular implementation to be used in your application.

  See [Ember.Location.HashLocation](/api/classes/Ember.Location.HashLocation).
  See [Ember.Location.HistoryLocation](/api/classes/Ember.Location.HistoryLocation).
  See [Ember.Location.NoneLocation](/api/classes/Ember.Location.NoneLocation).
  See [Ember.Location.AutoLocation](/api/classes/Ember.Location.AutoLocation).


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
  import Ember from 'ember';

  const { HistoryLocation } = Ember;

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
  @namespace Ember
  @static
  @private
*/
export default {
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
  create(options) {
    let implementation = options && options.implementation;
    assert('Ember.Location.create: you must specify a \'implementation\' option', !!implementation);

    let implementationClass = this.implementations[implementation];
    assert(`Ember.Location.create: ${implementation} is not a valid implementation`, !!implementationClass);

    return implementationClass.create(...arguments);
  },

  implementations: {},
  _location: environment.location,

  /**
    Returns the current `location.hash` by parsing location.href since browsers
    inconsistently URL-decode `location.hash`.

    https://bugzilla.mozilla.org/show_bug.cgi?id=483304

    @private
    @method getHash
    @since 1.4.0
  */
  _getHash() {
    return getHash(this.location);
  }
};
