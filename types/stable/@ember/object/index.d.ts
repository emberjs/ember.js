declare module '@ember/object' {
  import type { ElementDescriptor, ExtendedMethodDecorator } from '@ember/-internals/metal';
  import type { AnyFn } from '@ember/-internals/utility-types';
  import CoreObject from '@ember/object/core';
  import Observable from '@ember/object/observable';
  export {
    notifyPropertyChange,
    defineProperty,
    get,
    set,
    getProperties,
    setProperties,
    computed,
    trySet,
  } from '@ember/-internals/metal';
  /**
    @module @ember/object
    */
  /**
      `EmberObject` is the main base class for all Ember objects. It is a subclass
      of `CoreObject` with the `Observable` mixin applied. For details,
      see the documentation for each of these.

      @class EmberObject
      @extends CoreObject
      @uses Observable
      @public
    */
  interface EmberObject extends Observable {}
  const EmberObject_base: Readonly<typeof CoreObject> &
    (new (owner?: import('@ember/owner').default | undefined) => CoreObject) &
    import('@ember/object/mixin').default;
  class EmberObject extends EmberObject_base {
    get _debugContainerKey(): false | `${string}:${string}`;
  }
  export default EmberObject;
  export function action(
    target: ElementDescriptor[0],
    key: ElementDescriptor[1],
    desc: ElementDescriptor[2]
  ): PropertyDescriptor;
  export function action(desc: PropertyDescriptor): ExtendedMethodDecorator;
  type ObserverDefinition<T extends AnyFn> = {
    dependentKeys: string[];
    fn: T;
    sync: boolean;
  };
  /**
      Specify a method that observes property changes.

      ```javascript
      import EmberObject from '@ember/object';
      import { observer } from '@ember/object';

      export default EmberObject.extend({
        valueObserver: observer('value', function() {
          // Executes whenever the "value" property changes
        })
      });
      ```

      Also available as `Function.prototype.observes` if prototype extensions are
      enabled.

      @method observer
      @for @ember/object
      @param {String} propertyNames*
      @param {Function} func
      @return func
      @public
      @static
    */
  export function observer<T extends AnyFn>(
    ...args:
      | [propertyName: string, ...additionalPropertyNames: string[], func: T]
      | [ObserverDefinition<T>]
  ): T;
}
