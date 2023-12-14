declare module '@ember/engine/lib/engine-parent' {
  /**
    @module @ember/engine
    */
  import type EngineInstance from '@ember/engine/instance';
  export const ENGINE_PARENT: unique symbol;
  /**
      `getEngineParent` retrieves an engine instance's parent instance.

      @method getEngineParent
      @param {EngineInstance} engine An engine instance.
      @return {EngineInstance} The parent engine instance.
      @for @ember/engine
      @static
      @private
    */
  export function getEngineParent(engine: EngineInstance): EngineInstance | undefined;
  /**
      `setEngineParent` sets an engine instance's parent instance.

      @method setEngineParent
      @param {EngineInstance} engine An engine instance.
      @param {EngineInstance} parent The parent engine instance.
      @private
    */
  export function setEngineParent(engine: EngineInstance, parent: EngineInstance): void;
}
