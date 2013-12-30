var forEach = Ember.ArrayPolyfills.forEach;

/**
  @module ember
  @submodule ember-runtime
*/

var loadHooks = Ember.ENV.EMBER_LOAD_HOOKS || {};
var loaded = {};

/**
  Detects when a specific package of Ember (e.g. 'Ember.Handlebars')
  has fully loaded and is available for extension.

  The provided `callback` will be called with the `name` passed
  resolved from a string into the object:

  ``` javascript
  Ember.onLoad('Ember.Handlebars' function(hbars){
    hbars.registerHelper(...);
  });
  ```

  @method onLoad
  @for Ember
  @param name {String} name of hook
  @param callback {Function} callback to be called
*/
Ember.onLoad = function(name, callback) {
  var object;

  loadHooks[name] = loadHooks[name] || Ember.A();
  loadHooks[name].pushObject(callback);

  if (object = loaded[name]) {
    callback(object);
  }
};

/**
  Called when an Ember.js package (e.g Ember.Handlebars) has finished
  loading. Triggers any callbacks registered for this event.

  @method runLoadHooks
  @for Ember
  @param name {String} name of hook
  @param object {Object} object to pass to callbacks
*/
Ember.runLoadHooks = function(name, object) {
  loaded[name] = object;

  if (loadHooks[name]) {
    forEach.call(loadHooks[name], function(callback) {
      callback(object);
    });
  }
};
