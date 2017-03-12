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

  You can pass an implementation name (`hash`, `history`, `none`) to force a
  particular implementation to be used in your application.

  ### HashLocation

  Using `HashLocation` results in URLs with a `#` (hash sign) separating the
  server side URL portion of the URL from the portion that is used by Ember.
  This relies upon the `hashchange` event existing in the browser.

  Example:

  ```javascript
  App.Router.map(function() {
    this.route('posts', function() {
      this.route('new');
    });
  });

  App.Router.reopen({
    location: 'hash'
  });
  ```

  This will result in a posts.new url of `/#/posts/new`.

  ### HistoryLocation

  Using `HistoryLocation` results in URLs that are indistinguishable from a
  standard URL. This relies upon the browser's `history` API.

  Example:

  ```javascript
  App.Router.map(function() {
    this.route('posts', function() {
      this.route('new');
    });
  });

  App.Router.reopen({
    location: 'history'
  });
  ```

  This will result in a posts.new url of `/posts/new`.

  Keep in mind that your server must serve the Ember app at all the routes you
  define.

  ### AutoLocation

  Using `AutoLocation`, the router will use the best Location class supported by
  the browser it is running in.

  Browsers that support the `history` API will use `HistoryLocation`, those that
  do not, but still support the `hashchange` event will use `HashLocation`, and
  in the rare case neither is supported will use `NoneLocation`.

  Example:

  ```javascript
  App.Router.map(function() {
    this.route('posts', function() {
      this.route('new');
    });
  });

  App.Router.reopen({
    location: 'auto'
  });
  ```

  This will result in a posts.new url of `/posts/new` for modern browsers that
  support the `history` api or `/#/posts/new` for older ones, like Internet
  Explorer 9 and below.

  When a user visits a link to your application, they will be automatically
  upgraded or downgraded to the appropriate `Location` class, with the URL
  transformed accordingly, if needed.

  Keep in mind that since some of your users will use `HistoryLocation`, your
  server must serve the Ember app at all the routes you define.

  ### NoneLocation

  Using `NoneLocation` causes Ember to not store the applications URL state
  in the actual URL. This is generally used for testing purposes, and is one
  of the changes made when calling `App.setupForTesting()`.

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

  export default Ember.HistoryLocation.extend({
    implementation: 'history-url-logging',

    pushState: function (path) {
      console.log(path);
      this._super.apply(this, arguments);
    }
  });
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
