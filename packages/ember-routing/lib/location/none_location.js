/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set;

/**
  Ember.NoneLocation does not interact with the browser. It is useful for
  testing, or when you need to manage state with your Router, but temporarily
  don't want it to muck with the URL (for example when you embed your
  application in a larger page).

  @class NoneLocation
  @namespace Ember
  @extends Ember.Object
*/
Ember.NoneLocation = Ember.Object.extend({
  path: '',

  /**
    @private

    Returns the current path.

    @method getURL
    @return {String} path
  */
  getURL: function() {
    return get(this, 'path');
  },

  /**
    @private

    Set the path and remembers what was set. Using this method
    to change the path will not invoke the `updateURL` callback.

    @method setURL
    @param path {String}
  */
  setURL: function(path) {
    set(this, 'path', path);
  },

  /**
    @private

    Register a callback to be invoked when the path changes. These
    callbacks will execute when the user presses the back or forward
    button, but not after `setURL` is invoked.

    @method onUpdateURL
    @param callback {Function}
  */
  onUpdateURL: function(callback) {
    this.updateCallback = callback;
  },

  /**
    @private

    Sets the path and calls the `updateURL` callback.

    @method handleURL
    @param callback {Function}
  */
  handleURL: function(url) {
    set(this, 'path', url);
    this.updateCallback(url);
  },

  /**
    @private

    Given a URL, formats it to be placed into the page as part
    of an element's `href` attribute.

    This is used, for example, when using the {{action}} helper
    to generate a URL based on an event.

    @method formatURL
    @param url {String}
    @return {String} url
  */
  formatURL: function(url) {
    // The return value is not overly meaningful, but we do not want to throw
    // errors when test code renders templates containing {{action href=true}}
    // helpers.
    return url;
  }
});

Ember.Location.registerImplementation('none', Ember.NoneLocation);
