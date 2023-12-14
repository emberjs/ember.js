declare module '@ember/-internals/metal/lib/injected_property' {
  import type {
    DecoratorPropertyDescriptor,
    ElementDescriptor,
  } from '@ember/-internals/metal/lib/decorator';
  export let DEBUG_INJECTION_FUNCTIONS: WeakMap<Function, any>;
  /**
     @module ember
     @private
     */
  /**
      Read-only property that returns the result of a container lookup.

      @class InjectedProperty
      @namespace Ember
      @constructor
      @param {String} type The container type the property will lookup
      @param {String} nameOrDesc (optional) The name the property will lookup, defaults
             to the property's name
      @private
    */
  function inject(type: string, name: string): PropertyDecorator;
  function inject(type: string): PropertyDecorator;
  function inject(type: string, ...args: [ElementDescriptor[0], ElementDescriptor[1]]): void;
  function inject(type: string, ...args: ElementDescriptor): DecoratorPropertyDescriptor;
  function inject(
    type: string,
    ...args: [] | [name: string] | ElementDescriptor
  ): PropertyDecorator | DecoratorPropertyDescriptor | void;
  export default inject;
}
