declare module '@ember/-internals/metal/lib/decorator' {
  import type { Meta } from '@ember/-internals/meta';
  export type DecoratorPropertyDescriptor =
    | (PropertyDescriptor & {
        initializer?: any;
      })
    | undefined;
  export type ExtendedMethodDecorator = (
    target: object,
    key: string,
    desc: DecoratorPropertyDescriptor,
    maybeMeta?: Meta,
    isClassicDecorator?: boolean
  ) => DecoratorPropertyDescriptor;
  export type ElementDescriptor = [
    target: object,
    propertyName: string,
    descriptor?: DecoratorPropertyDescriptor
  ];
  export function isElementDescriptor(args: unknown[]): args is ElementDescriptor;
  export function nativeDescDecorator(propertyDesc: PropertyDescriptor): () => PropertyDescriptor;
  /**
      Objects of this type can implement an interface to respond to requests to
      get and set. The default implementation handles simple properties.

      @class Descriptor
      @private
    */
  export abstract class ComputedDescriptor {
    enumerable: boolean;
    configurable: boolean;
    _dependentKeys?: string[];
    _meta: any;
    setup(
      _obj: object,
      keyName: string,
      _propertyDesc: DecoratorPropertyDescriptor | undefined,
      meta: Meta
    ): void;
    teardown(_obj: object, keyName: string, meta: Meta): void;
    abstract get(obj: object, keyName: string): any | null | undefined;
    abstract set(
      obj: object,
      keyName: string,
      value: any | null | undefined
    ): any | null | undefined;
  }
  export let COMPUTED_GETTERS: WeakSet<() => unknown>;
  export const COMPUTED_SETTERS: WeakSet<object>;
  export function makeComputedDecorator(
    desc: ComputedDescriptor,
    DecoratorClass: {
      prototype: object;
    }
  ): ExtendedMethodDecorator;
  /**
      Returns the CP descriptor associated with `obj` and `keyName`, if any.

      @method descriptorForProperty
      @param {Object} obj the object to check
      @param {String} keyName the key to check
      @return {Descriptor}
      @private
    */
  export function descriptorForProperty(obj: object, keyName: string, _meta?: Meta | null): any;
  export function descriptorForDecorator(dec: Function): ComputedDescriptor | true | undefined;
  /**
      Check whether a value is a decorator

      @method isClassicDecorator
      @param {any} possibleDesc the value to check
      @return {boolean}
      @private
    */
  export function isClassicDecorator(dec: unknown): dec is ExtendedMethodDecorator;
  /**
      Set a value as a decorator

      @method setClassicDecorator
      @param {function} decorator the value to mark as a decorator
      @private
    */
  export function setClassicDecorator(
    dec: ExtendedMethodDecorator,
    value?: ComputedDescriptor | true
  ): void;
}
