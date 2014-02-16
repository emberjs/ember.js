// Provides a way to register library versions with ember.
import EnumerableUtils from "ember-metal/enumerable_utils";

var forEach = EnumerableUtils.forEach,
    indexOf = EnumerableUtils.indexOf;

export defult function libraries() {
  var _libraries   = [];
  var coreLibIndex = 0;

  var getLibrary = function(name) {
    for (var i = 0; i < _libraries.length; i++) {
      if (_libraries[i].name === name) {
        return _libraries[i];
      }
    }
  };

  _libraries.register = function(name, version) {
    if (!getLibrary(name)) {
      _libraries.push({name: name, version: version});
    }
  };

  _libraries.registerCoreLibrary = function(name, version) {
    if (!getLibrary(name)) {
      _libraries.splice(coreLibIndex++, 0, {name: name, version: version});
    }
  };

  _libraries.deRegister = function(name) {
    var lib = getLibrary(name);
    if (lib) _libraries.splice(indexOf(_libraries, lib), 1);
  };

  _libraries.each = function (callback) {
    forEach(_libraries, function(lib) {
      callback(lib.name, lib.version);
    });
  };

  return _libraries;
}();
