declare module '@ember/-internals/metal/lib/libraries' {
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
    constructor();
    _getLibraryByName(name: string): Library | undefined;
    register(name: string, version: string, isCoreLibrary?: boolean): void;
    registerCoreLibrary(name: string, version: string): void;
    deRegister(name: string): void;
    isRegistered?: (name: string) => boolean;
    logVersions?: () => void;
  }
  const LIBRARIES: Libraries;
  export default LIBRARIES;
}
