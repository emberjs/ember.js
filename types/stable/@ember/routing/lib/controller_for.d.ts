declare module '@ember/routing/lib/controller_for' {
  import type { Container } from '@ember/-internals/container';
  import type { FactoryClass, InternalFactory } from '@ember/-internals/owner';
  import type { RegisterOptions } from '@ember/owner';
  /**
      @module @ember/routing
    */
  /**
      Finds a controller instance.

      @for Ember
      @method controllerFor
      @private
    */
  export default function controllerFor(
    container: Container,
    controllerName: string,
    lookupOptions: RegisterOptions
  ): InternalFactory<object, FactoryClass> | object | undefined;
}
