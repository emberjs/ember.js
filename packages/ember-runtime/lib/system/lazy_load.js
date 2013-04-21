var forEach = Ember.ArrayPolyfills.forEach;

/**
@module ember
@submodule ember-runtime
*/

var loadHooks = Ember.ENV.EMBER_LOAD_HOOKS || {};
var loaded = {};

/**
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
