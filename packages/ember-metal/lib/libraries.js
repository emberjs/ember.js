import { warn } from 'ember-metal/debug';
import isEnabled from 'ember-metal/features';

/**
  Helper class that allows you to register your library with Ember.

  Singleton created at `Ember.libraries`.

  @class Libraries
  @constructor
  @private
*/
function Libraries() {
  this._registry = [];
  this._coreLibIndex = 0;
}

Libraries.prototype = {
  constructor: Libraries,

  _getLibraryByName(name) {
    var libs = this._registry;
    var count = libs.length;

    for (var i = 0; i < count; i++) {
      if (libs[i].name === name) {
        return libs[i];
      }
    }
  },

  register(name, version, isCoreLibrary) {
    var index = this._registry.length;

    if (!this._getLibraryByName(name)) {
      if (isCoreLibrary) {
        index = this._coreLibIndex++;
      }
      this._registry.splice(index, 0, { name: name, version: version });
    } else {
      warn(`Library "${name}" is already registered with Ember.`, false, { id: 'ember-metal.libraries-register' });
    }
  },

  registerCoreLibrary(name, version) {
    this.register(name, version, true);
  },

  deRegister(name) {
    var lib = this._getLibraryByName(name);
    var index;

    if (lib) {
      index = this._registry.indexOf(lib);
      this._registry.splice(index, 1);
    }
  }
};

if (isEnabled('ember-libraries-isregistered')) {
  Libraries.prototype.isRegistered = function(name) {
    return !!this._getLibraryByName(name);
  };
}

export default Libraries;
