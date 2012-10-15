/**
@module ember
@submodule ember-runtime
*/

var loadHooks = {};
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
  var hooks;

  loaded[name] = object;

  if (hooks = loadHooks[name]) {
    loadHooks[name].forEach(function(callback) {
      callback(object);
    });
  }
};
