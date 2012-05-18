var loadHooks = {};
var loaded = {};

Ember.onLoad = function(name, callback) {
  var object;

  loadHooks[name] = loadHooks[name] || Ember.A();
  loadHooks[name].pushObject(callback);

  if (object = loaded[name]) {
    callback(object);
  }
};

Ember.runLoadHooks = function(name, object) {
  var hooks;

  loaded[name] = object;

  if (hooks = loadHooks[name]) {
    loadHooks[name].forEach(function(callback) {
      callback(object);
    });
  }
};
