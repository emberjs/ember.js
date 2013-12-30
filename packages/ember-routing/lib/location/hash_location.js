/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set;

/**
  Ember.HashLocation implements the location API using the browser's
  hash. At present, it relies on a hashchange event existing in the
  browser.

  @class HashLocation
  @namespace Ember
  @extends Ember.Object
*/
Ember.HashLocation = Ember.Object.extend({
  implementation: 'hash',

  init: function() {
    set(this, 'location', get(this, 'location') || window.location);
  },

  /**
    Returns the current `location.hash`, minus the '#' at the front.

    @private
    @method getURL
  */
  getURL: function() {
    if (Ember.FEATURES.isEnabled("query-params")) {
      // location.hash is not used because it is inconsistently
      // URL-decoded between browsers.
      var href = get(this, 'location').href,
        hashIndex = href.indexOf('#');

      if ( hashIndex === -1 ) {
        return "";
      } else {
        return href.substr(hashIndex + 1);
      }
    }
    // Default implementation without feature flag enabled
    return get(this, 'location').hash.substr(1);
  },

  /**
    Set the `location.hash` and remembers what was set. This prevents
    `onUpdateURL` callbacks from triggering when the hash was set by
    `HashLocation`.

    @private
    @method setURL
    @param path {String}
  */
  setURL: function(path) {
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
  replaceURL: function(path) {
    get(this, 'location').replace('#' + path);
  },

  /**
    Register a callback to be invoked when the hash changes. These
    callbacks will execute when the user presses the back or forward
    button, but not after `setURL` is invoked.

    @private
    @method onUpdateURL
    @param callback {Function}
  */
  onUpdateURL: function(callback) {
    var self = this;
    var guid = Ember.guidFor(this);

    Ember.$(window).on('hashchange.ember-location-'+guid, function() {
      Ember.run(function() {
        var path = location.hash.substr(1);
        if (get(self, 'lastSetURL') === path) { return; }

        set(self, 'lastSetURL', null);

        callback(path);
      });
    });
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
  formatURL: function(url) {
    return '#'+url;
  },

  /**
    Cleans up the HashLocation event listener.

    @private
    @method willDestroy
  */
  willDestroy: function() {
    var guid = Ember.guidFor(this);

    Ember.$(window).off('hashchange.ember-location-'+guid);
  }
});
