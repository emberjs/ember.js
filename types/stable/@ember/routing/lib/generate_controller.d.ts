declare module '@ember/routing/lib/generate_controller' {
  import type { InternalFactory, default as Owner } from '@ember/-internals/owner';
  import Controller from '@ember/controller';
  /**
     @module @ember/routing
    */
  /**
      Generates a controller factory

      @for Ember
      @method generateControllerFactory
      @private
    */
  export function generateControllerFactory(
    owner: Owner,
    controllerName: string
  ): InternalFactory<{}>;
  /**
      Generates and instantiates a controller extending from `controller:basic`
      if present, or `Controller` if not.

      @for Ember
      @method generateController
      @private
      @since 1.3.0
    */
  export default function generateController(owner: Owner, controllerName: string): Controller;
}
