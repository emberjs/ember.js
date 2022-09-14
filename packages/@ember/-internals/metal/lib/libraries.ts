import { EMBER_LIBRARIES_ISREGISTERED } from '@ember/canary-features';
import { assert, debug, warn } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import VERSION from 'ember/version';
import { get } from './property_get';

interface Library {
  readonly name: string;
  readonly version: string;
}

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
  readonly _registry: Library[];
  _coreLibIndex: number;

  constructor() {
    this._registry = [];
    this._coreLibIndex = 0;
  }

  _getLibraryByName(name: string): Library | undefined {
    let libs = this._registry;

    for (let lib of libs) {
      if (lib.name === name) {
        return lib;
      }
    }
    return undefined;
  }

  register(name: string, version: string, isCoreLibrary?: boolean): void {
    let index = this._registry.length;

    if (!this._getLibraryByName(name)) {
      if (isCoreLibrary) {
        index = this._coreLibIndex++;
      }
      this._registry.splice(index, 0, { name, version });
    } else {
      warn(`Library "${name}" is already registered with Ember.`, false, {
        id: 'ember-metal.libraries-register',
      });
    }
  }

  registerCoreLibrary(name: string, version: string): void {
    this.register(name, version, true);
  }

  deRegister(name: string): void {
    let lib = this._getLibraryByName(name);
    let index;

    if (lib) {
      index = this._registry.indexOf(lib);
      this._registry.splice(index, 1);
    }
  }

  isRegistered?: (name: string) => boolean;
  logVersions?: () => void;
}

if (EMBER_LIBRARIES_ISREGISTERED) {
  Libraries.prototype.isRegistered = function (name: string): boolean {
    return Boolean(this._getLibraryByName(name));
  };
}

if (DEBUG) {
  Libraries.prototype.logVersions = function (): void {
    let libs = this._registry;
    let nameLengths = libs.map((item) => get(item, 'name.length') as number);
    assert(
      'nameLengths is number array',
      nameLengths instanceof Array && nameLengths.every((n) => typeof n === 'number')
    );
    let maxNameLength = Math.max.apply(null, nameLengths);

    debug('-------------------------------');
    for (let lib of libs) {
      let spaces = new Array(maxNameLength - lib.name.length + 1).join(' ');
      debug([lib.name, spaces, ' : ', lib.version].join(''));
    }
    debug('-------------------------------');
  };
}
const LIBRARIES = new Libraries();
LIBRARIES.registerCoreLibrary('Ember', VERSION);

export default LIBRARIES;
