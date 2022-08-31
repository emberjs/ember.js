declare module '@ember/object' {
  import CoreObject from '@ember/object/core';
  import type Observable from '@ember/object/observable';
  import type ComputedProperty from '@ember/object/computed';
  import type { BasicComputedProperty } from '@ember/object/computed';
  import type { AnyFunction } from '@ember/object/-private/types';

  /**
   * `Ember.Object` is the main base class for all Ember objects. It is a subclass
   * of `Ember.CoreObject` with the `Ember.Observable` mixin applied. For details,
   * see the documentation for each of these.
   */
  export default class EmberObject extends CoreObject {}
  export default interface EmberObject extends Observable {}

  /**
   * This helper returns a new property descriptor that wraps the passed computed
   * property function. You can use this helper to define properties with native
   * decorator syntax, mixins, or via `defineProperty()`.
   *
   * @param dependentKeys Optional dependent keys that trigger this computed
   *   property.
   */
  export function computed(...dependentKeys: string[]): ComputedProperty & MethodDecorator;

  export function computed(
    ...args: [...dependentKeys: string[], callback: AnyFunction]
  ): BasicComputedProperty;

  /**
   * Specify a method that observes property changes.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function observer<Fn extends (target: any, key: string) => void>(
    ...args: [...propertyNames: string[], func: Fn]
  ): Fn;

  /**
   * Gets the value of a property on an object. If the property is computed,
   * the function will be invoked. If the property is not defined but the
   * object implements the `unknownProperty` method then that will be invoked.
   */
  export function get<T, K extends keyof T>(obj: T, key: K): T[K];
  export function get(obj: unknown, key: string): unknown;

  /**
   * Sets the value of a property on an object, respecting computed properties
   * and notifying observers and other listeners of the change. If the
   * property is not defined but the object implements the `setUnknownProperty`
   * method then that will be invoked as well.
   */
  export function set<T, K extends keyof T, V extends T[K]>(obj: T, key: K, value: V): V;

  /**
   * To get multiple properties at once, call `getProperties` with an object
   * followed by a list of strings or an array.
   */
  export function getProperties<T, K extends keyof T>(obj: T, list: K[]): Pick<T, K>;
  export function getProperties<T, K extends keyof T>(obj: T, ...list: K[]): Pick<T, K>;

  /**
   * Set a list of properties on an object. These properties are set inside
   * a single `beginPropertyChanges` and `endPropertyChanges` batch, so
   * observers will be buffered.
   */
  export function setProperties<T, K extends keyof T>(obj: T, hash: Pick<T, K>): Pick<T, K>;

  /**
   * Error-tolerant form of `Ember.set`. Will not blow up if any part of the
   * chain is `undefined`, `null`, or destroyed.
   */
  export function trySet(root: object, path: string, value: unknown): unknown;

  /**
   * NOTE: This is a low-level method used by other parts of the API. You almost
   * never want to call this method directly. Instead you should use mixin() to
   * define new properties.
   *
   * @param obj the object to define this property on. This may be a prototype.
   * @param keyName the name of the property
   * @param desc an instance of `Descriptor` (typically a computed property) or an
   *   ES5 descriptor. You must provide this or `data` but not both.
   * @param meta Normally this method takes only three parameters. However if you
   *   pass an instance of Descriptor as the third param then you can pass an
   *   optional value as the fourth parameter. This is often more efficient than
   *   creating new descriptor hashes for each property.
   */
  export function defineProperty(
    obj: object,
    keyName: string,
    desc: PropertyDescriptor | ComputedProperty,
    meta?: unknown
  ): void;

  /**
   * NOTE: This is a low-level method used by other parts of the API. You almost
   * never want to call this method directly. Instead you should use mixin() to
   * define new properties.
   *
   * @param obj the object to define this property on. This may be a prototype.
   * @param keyName the name of the property
   * @param desc an instance of `Descriptor` (typically a computed property) or an
   *   ES5 descriptor. You must provide this or `data` but not both.
   * @param data something other than a descriptor, that will become the explicit
   *   value of this property.
   */
  export function defineProperty(
    obj: object,
    keyName: string,
    desc: undefined,
    data: unknown
  ): void;

  export function notifyPropertyChange(obj: object, keyName: string): void;

  export const action: MethodDecorator;
}

declare module '@ember/utils/-private/types' {
  import EmberObject from '@ember/object';

  interface TypeLookup {
    class: typeof EmberObject;
    instance: EmberObject;
  }
}
