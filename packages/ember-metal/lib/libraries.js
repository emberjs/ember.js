import { warn } from 'ember-debug';
import { EMBER_LIBRARIES_ISREGISTERED } from 'ember/features';
/**
 @module ember
*/
/**
  Helper class that allows you to register your library with Ember.

  Singleton created at `Ember.libraries`.

  @class Libraries
  @constructor
  @private
*/
export class Libraries {
  constructor() {
    this._registry = [];
  }

  _getLibraryByName(name) {
    let libs = this._registry;
    let count = libs.length;

    for (let i = 0; i < count; i++) {
      if (libs[i].name === name) {
        return libs[i];
      }
    }
  }

  register(name, version) {
    let index = this._registry.length;
    if (this._getLibraryByName(name)) {
      warn(`Library "${name}" is already registered with Ember.`, false, { id: 'ember-metal.libraries-register' });
    } else {
      this._registry.splice(index, 0, { name, version });
    }
  }

  registerCoreLibrary(name, version) {
    this.register(name, version);
  }

  deRegister(name) {
    let lib = this._getLibraryByName(name);
    let index;

    if (lib) {
      index = this._registry.indexOf(lib);
      this._registry.splice(index, 1);
    }
  }
}

if (EMBER_LIBRARIES_ISREGISTERED) {
  Libraries.prototype.isRegistered = function(name) {
    return !!this._getLibraryByName(name);
  };
}

export default new Libraries();
