import { Mixin } from '@ember/-internals/metal';

export type ObserverMethod<Target, Sender> =
  | keyof Target
  | ((this: Target, sender: Sender, key: string, value: any, rev: number) => void);

/**
 * This mixin provides properties and property observing functionality, core features of the Ember object model.
 */
export interface Observable {
  /**
   * Retrieves the value of a property from the object.
   */
  get(key: string): unknown;

  /**
   * To get the values of multiple properties at once, call `getProperties`
   * with a list of strings or an array:
   */
  getProperties<L extends string[]>(list: L): { [Key in L[number]]: unknown };
  getProperties<L extends string[]>(...list: L): { [Key in L[number]]: unknown };

  // NOT TYPE SAFE!
  /**
   * Sets the provided key or path to the value.
   */
  set<T>(key: string, value: T): T;

  // NOT TYPE SAFE!
  /**
   * Sets a list of properties at once. These properties are set inside
   * a single `beginPropertyChanges` and `endPropertyChanges` batch, so
   * observers will be buffered.
   */
  setProperties<T extends Record<string, any>>(hash: T): T;

  /**
   * Convenience method to call `propertyWillChange` and `propertyDidChange` in
   * succession.
   */
  notifyPropertyChange(keyName: string): this;

  /**
   * Adds an observer on a property.
   */
  addObserver<Target>(key: keyof this, target: Target, method: ObserverMethod<Target, this>): this;
  addObserver(key: keyof this, method: ObserverMethod<this, this>): this;

  /**
   * Remove an observer you have previously registered on this object. Pass
   * the same key, target, and method you passed to `addObserver()` and your
   * target will no longer receive notifications.
   */
  removeObserver<Target>(
    key: keyof this,
    target: Target,
    method: ObserverMethod<Target, this>
  ): this;
  removeObserver(key: keyof this, method: ObserverMethod<this, this>): this;

  // NOT TYPE SAFE!
  /**
   * Set the value of a property to the current value plus some amount.
   */
  incrementProperty(keyName: keyof this, increment?: number): number;

  // NOT TYPE SAFE!
  /**
   * Set the value of a property to the current value minus some amount.
   */
  decrementProperty(keyName: keyof this, decrement?: number): number;

  // NOT TYPE SAFE!
  /**
   * Set the value of a boolean property to the opposite of its
   * current value.
   */
  toggleProperty(keyName: keyof this): boolean;

  /**
   * Returns the cached value of a computed property, if it exists.
   * This allows you to inspect the value of a computed property
   * without accidentally invoking it if it is intended to be
   * generated lazily.
   */
  cacheFor<K extends keyof this>(key: K): unknown;
}

declare const Observable: Mixin;
export default Observable;
