import Ember from "ember-metal/core"; // deprecate, assert
import environment from "ember-metal/environment";
import { getHash } from "ember-routing/location/util";

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
    this.resource('posts', function() {
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
    this.resource('posts', function() {
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
    this.resource('posts', function() {
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

  Calling setURL or replaceURL will not trigger onUpdateURL callbacks.

  @class Location
  @namespace Ember
  @static
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
  */
  create: function(options) {
    var implementation = options && options.implementation;
    Ember.assert("Ember.Location.create: you must specify a 'implementation' option", !!implementation);

    var implementationClass = this.implementations[implementation];
    Ember.assert("Ember.Location.create: " + implementation + " is not a valid implementation", !!implementationClass);

    return implementationClass.create.apply(implementationClass, arguments);
  },

  /**
   This is deprecated in favor of using the container to register the
   location implementation as desired.

   Example:

   ```javascript
   Application.initializer({
    name: "history-test-location",

    initialize: function(container, application) {
      application.register('location:history-test', HistoryTestLocation);
    }
   });
   ```

   @method registerImplementation
   @param {String} name
   @param {Object} implementation of the `location` API
   @deprecated Register your custom location implementation with the
   container directly.
  */
  registerImplementation: function(name, implementation) {
    Ember.deprecate('Using the Ember.Location.registerImplementation is no longer supported.' +
                    ' Register your custom location implementation with the container instead.', false);

    this.implementations[name] = implementation;
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
  _getHash: function () {
    return getHash(this._location || this.location);
  }
};
