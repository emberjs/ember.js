/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set;

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
Ember.Location = {
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
    this.implementations[name] = implementation;
  },

  implementations: {}
};
