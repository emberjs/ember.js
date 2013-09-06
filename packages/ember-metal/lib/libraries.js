// Provides a way to register library versions with ember.

Ember.libraries = function() {
  var libraries    = [];
  var coreLibIndex = 0;

  var getLibrary = function(name) {
    for (var i = 0; i < libraries.length; i++) {
      if (libraries[i].name === name) {
        return libraries[i];
      }
    }
  };

  libraries.register = function(name, version) {
    if (!getLibrary(name)) {
      libraries.push({name: name, version: version});
    }
  };

  libraries.registerCoreLibrary = function(name, version) {
    if (!getLibrary(name)) {
      libraries.splice(coreLibIndex++, 0, {name: name, version: version});
    }
  };

  libraries.deRegister = function(name) {
    var lib = getLibrary(name);
    if (lib) libraries.splice(libraries.indexOf(lib), 1);
  };

  libraries.each = function (callback) {
    libraries.forEach(function(lib) {
      callback(lib.name, lib.version);
    });
  };
  return libraries;
}();

Ember.libraries.registerCoreLibrary('Ember', Ember.VERSION);
