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

  getURL: function() {
    return get(this, 'path');
  },

  setURL: function(path) {
    set(this, 'path', path);
  },

  onUpdateURL: function(callback) {
    this.updateCallback = callback;
  },

  handleURL: function(url) {
    set(this, 'path', url);
    this.updateCallback(url);
  },

  formatURL: function(url) {
    // The return value is not overly meaningful, but we do not want to throw
    // errors when test code renders templates containing {{action href=true}}
    // helpers.
    return url;
  }
});

Ember.Location.registerImplementation('none', Ember.NoneLocation);
