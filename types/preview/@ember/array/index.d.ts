declare module '@ember/array' {
  import { MethodNamesOf, MethodParams, MethodReturns } from 'ember/-private/type-utils';
  import Mixin from '@ember/object/mixin';
  import Enumerable from '@ember/array/-private/enumerable';
  import NativeArray from '@ember/array/-private/native-array';

  /**
   * This module implements Observer-friendly Array-like behavior. This mixin is picked up by the
   * Array class as well as other controllers, etc. that want to appear to be arrays.
   */
  interface Array<T> extends Enumerable {
    /**
     * __Required.__ You must implement this method to apply this mixin.
     */
    length: number;
    /**
     * Returns the object at the given `index`. If the given `index` is negative
     * or is greater or equal than the array length, returns `undefined`.
     */
    objectAt(idx: number): T | undefined;
    /**
     * This returns the objects at the specified indexes, using `objectAt`.
     */
    objectsAt(indexes: number[]): Array<T | undefined>;
    /**
     * Helper method returns the first object from a collection. This is usually
     * used by bindings and other parts of the framework to extract a single
     * object if the enumerable contains only one item.
     */
    firstObject: T | undefined;
    /**
     * Helper method returns the last object from a collection. If your enumerable
     * contains only one object, this method should always return that object.
     * If your enumerable is empty, this method should return `undefined`.
     */
    lastObject: T | undefined;
    /**
     * Returns a new array that is a slice of the receiver. This implementation
     * uses the observable array methods to retrieve the objects for the new
     * slice.
     */
    slice(beginIndex?: number, endIndex?: number): NativeArray<T>;
    /**
     * Returns the index of the given object's first occurrence.
     * If no `startAt` argument is given, the starting location to
     * search is 0. If it's negative, will count backward from
     * the end of the array. Returns -1 if no match is found.
     */
    indexOf(searchElement: T, fromIndex?: number): number;
    /**
     * Returns the index of the given object's last occurrence.
     * If no `startAt` argument is given, the search starts from
     * the last position. If it's negative, will count backward
     * from the end of the array. Returns -1 if no match is found.
     */
    lastIndexOf(searchElement: T, fromIndex?: number): number;
    /**
     * Iterates through the enumerable, calling the passed function on each
     * item. This method corresponds to the `forEach()` method defined in
     * JavaScript 1.6.
     */
    forEach<Target>(
      callback: (this: Target, item: T, index: number, arr: this) => void,
      target?: Target
    ): this;
    /**
     * Alias for `mapBy`
     */
    getEach<K extends keyof T>(key: K): NativeArray<T[K]>;
    /**
     * Sets the value on the named property for each member. This is more
     * ergonomic than using other methods defined on this helper. If the object
     * implements Ember.Observable, the value will be changed to `set(),` otherwise
     * it will be set directly. `null` objects are skipped.
     */
    setEach<K extends keyof T>(key: K, value: T[K]): this;
    /**
     * Maps all of the items in the enumeration to another value, returning
     * a new array. This method corresponds to `map()` defined in JavaScript 1.6.
     */
    map<U, Target>(
      callback: (this: Target, item: T, index: number, arr: this) => U,
      target?: Target
    ): NativeArray<U>;
    /**
     * Similar to map, this specialized function returns the value of the named
     * property on all items in the enumeration.
     */
    mapBy<K extends keyof T>(key: K): NativeArray<T[K]>;
    mapBy(key: string): NativeArray<unknown>;
    /**
     * Returns an array with all of the items in the enumeration that the passed
     * function returns true for. This method corresponds to `filter()` defined in
     * JavaScript 1.6.
     */
    filter<Target>(
      callback: (this: Target, item: T, index: number, arr: this) => unknown,
      target?: Target
    ): NativeArray<T>;
    /**
     * Returns an array with all of the items in the enumeration where the passed
     * function returns false. This method is the inverse of filter().
     */
    reject<Target>(
      callback: (this: Target, item: T, index: number, arr: this) => unknown,
      target?: Target
    ): NativeArray<T>;
    /**
     * Returns an array with just the items with the matched property. You
     * can pass an optional second argument with the target value. Otherwise
     * this will match any property that evaluates to `true`.
     */
    filterBy<K extends keyof T>(key: K, value?: T[K]): NativeArray<T>;
    filterBy(key: string, value?: unknown): NativeArray<T>;
    /**
     * Returns an array with the items that do not have truthy values for
     * key.  You can pass an optional second argument with the target value.  Otherwise
     * this will match any property that evaluates to false.
     */
    rejectBy<K extends keyof T>(key: K, value?: T[K]): NativeArray<T>;
    rejectBy(key: string, value?: unknown): NativeArray<T>;
    /**
     * Returns the first item in the array for which the callback returns true.
     * This method works similar to the `filter()` method defined in JavaScript 1.6
     * except that it will stop working on the array once a match is found.
     */
    find<S extends T, Target = void>(
      predicate: (this: void, value: T, index: number, obj: T[]) => value is S,
      thisArg?: Target
    ): S | undefined;
    find<Target = void>(
      callback: (this: Target, item: T, index: number, arr: this) => unknown,
      target?: Target
    ): T | undefined;
    /**
     * Returns the first item with a property matching the passed value. You
     * can pass an optional second argument with the target value. Otherwise
     * this will match any property that evaluates to `true`.
     */
    findBy<K extends keyof T>(key: K, value?: T[K]): T | undefined;
    findBy(key: string, value?: unknown): T | undefined;
    /**
     * Returns `true` if the passed function returns true for every item in the
     * enumeration. This corresponds with the `every()` method in JavaScript 1.6.
     */
    every<Target = void>(
      callback: (this: Target, item: T, index: number, arr: this) => unknown,
      target?: Target
    ): boolean;
    /**
     * Returns `true` if the passed property resolves to the value of the second
     * argument for all items in the enumerable. This method is often simpler/faster
     * than using a callback.
     */
    isEvery<K extends keyof T>(key: K, value?: T[K]): boolean;
    isEvery(key: string, value?: unknown): boolean;
    /**
     * Returns `true` if the passed function returns true for any item in the
     * enumeration.
     */
    any<Target = void>(
      callback: (this: Target, item: T, index: number, arr: this) => unknown,
      target?: Target
    ): boolean;
    /**
     * Returns `true` if the passed property resolves to the value of the second
     * argument for any item in the enumerable. This method is often simpler/faster
     * than using a callback.
     */
    isAny<K extends keyof T>(key: K, value?: T[K]): boolean;
    isAny(key: string, value?: unknown): boolean;
    /**
     * This will combine the values of the enumerator into a single value. It
     * is a useful way to collect a summary value from an enumeration. This
     * corresponds to the `reduce()` method defined in JavaScript 1.8.
     */
    reduce<V>(
      callback: (summation: V, current: T, index: number, arr: this) => V,
      initialValue?: V
    ): V;
    /**
     * Invokes the named method on every object in the receiver that
     * implements it. This method corresponds to the implementation in
     * Prototype 1.6.
     */
    invoke<M extends MethodNamesOf<T>>(
      methodName: M,
      ...args: MethodParams<T, M>
    ): NativeArray<MethodReturns<T, M>>;
    /**
     * Simply converts the enumerable into a genuine array. The order is not
     * guaranteed. Corresponds to the method implemented by Prototype.
     */
    toArray(): T[];
    /**
     * Returns a copy of the array with all `null` and `undefined` elements removed.
     */
    compact(): NativeArray<NonNullable<T>>;
    /**
     * Returns `true` if the passed object can be found in the enumerable.
     */
    includes(searchElement: T, fromIndex?: number): boolean;
    /**
     * Converts the enumerable into an array and sorts by the keys
     * specified in the argument.
     */
    sortBy(...properties: string[]): T[];
    /**
     * Returns a new enumerable that excludes the passed value. The default
     * implementation returns an array regardless of the receiver type.
     * If the receiver does not contain the value it returns the original enumerable.
     */
    without(value: T): NativeArray<T>;
    /**
     * Returns a new enumerable that contains only unique values. The default
     * implementation returns an array regardless of the receiver type.
     */
    uniq(): NativeArray<T>;
    /**
     * Returns a new enumerable that contains only items containing a unique property value.
     * The default implementation returns an array regardless of the receiver type.
     */
    uniqBy(property: string): NativeArray<T>;
    uniqBy(callback: (value: T) => unknown): NativeArray<T>;
    /**
     * This is the handler for the special array content property. If you get
     * this property, it will return this. If you set this property to a new
     * array, it will replace the current content.
     */
    get '[]'(): this;
    set '[]'(newValue: T[] | Array<T>);
  }
  // Ember.Array rather than Array because the `array-type` lint rule doesn't realize the global is shadowed
  const Array: Mixin;
  export default Array;

  /**
   * Creates an `Ember.NativeArray` from an Array like object.
   * Does not modify the original object's contents. Ember.A is not needed if
   * `EmberENV.EXTEND_PROTOTYPES` is `true` (the default value). However,
   * it is recommended that you use Ember.A when creating addons for
   * ember or when you can not guarantee that `EmberENV.EXTEND_PROTOTYPES`
   * will be `true`.
   */
  export function A<T>(arr?: T[]): NativeArray<T>;

  /**
   * Returns true if the passed object is an array or Array-like.
   */
  export function isArray(obj: unknown): obj is ArrayLike<unknown>;
}
