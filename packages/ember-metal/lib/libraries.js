import { warn, debug } from 'ember-debug';
import { DEBUG } from 'ember-env-flags';
import { get } from './property_get';
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
    this._coreLibIndex = 0;
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

  register(name, version, isCoreLibrary) {
    let index = this._registry.length;

    if (!this._getLibraryByName(name)) {
      if (isCoreLibrary) {
        index = this._coreLibIndex++;
      }
      this._registry.splice(index, 0, { name, version });
    } else {
      warn(`Library "${name}" is already registered with Ember.`, false, { id: 'ember-metal.libraries-register' });
    }
  }

  registerCoreLibrary(name, version) {
    this.register(name, version, true);
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

if (DEBUG) {
  Libraries.prototype.logVersions = function() {
    let libs = this._registry;
    let nameLengths = libs.map(item => get(item, 'name.length'));
    let maxNameLength = Math.max.apply(null, nameLengths);

    debug('-------------------------------');
    for (let i = 0; i < libs.length; i++) {
      let lib = libs[i];
      let spaces = new Array(maxNameLength - lib.name.length + 1).join(' ');
      debug([lib.name, spaces, ' : ', lib.version].join(''));
    }
    debug('-------------------------------');
  };
}

export default new Libraries();
