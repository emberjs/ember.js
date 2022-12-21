declare module '@ember/array/-private/native-array' {
  import Observable from '@ember/object/observable';
  import EmberArray from '@ember/array';
  import MutableArray from '@ember/array/mutable';
  import Mixin from '@ember/object/mixin';

  // Get an alias to the global Array type to use in inner scope below.
  type Array<T> = T[];

  type AnyArray<T> = EmberArray<T> | Array<T> | ReadonlyArray<T>;

  /**
   * The final definition of NativeArray removes all native methods. This is the list of removed methods
   * when run in Chrome 106.
   */
  type IGNORED_MUTABLE_ARRAY_METHODS =
    | 'length'
    | 'slice'
    | 'indexOf'
    | 'lastIndexOf'
    | 'forEach'
    | 'map'
    | 'filter'
    | 'find'
    | 'every'
    | 'reduce'
    | 'includes';

  /**
   * These additional items must be redefined since `Omit` causes methods that return `this` to return the
   * type at the time of the Omit.
   */
  type RETURN_SELF_ARRAY_METHODS =
    | '[]'
    | 'clear'
    | 'insertAt'
    | 'removeAt'
    | 'pushObjects'
    | 'unshiftObjects'
    | 'reverseObjects'
    | 'setObjects'
    | 'removeObject'
    | 'removeObjects'
    | 'addObject'
    | 'addObjects'
    | 'setEach';

  // This is the same as MutableArray, but removes the actual native methods that exist on Array.prototype.
  interface MutableArrayWithoutNative<T>
    extends Omit<MutableArray<T>, IGNORED_MUTABLE_ARRAY_METHODS | RETURN_SELF_ARRAY_METHODS> {
    /**
     * Remove all elements from the array. This is useful if you
     * want to reuse an existing array without having to recreate it.
     */
    clear(): this;
    /**
     * This will use the primitive `replace()` method to insert an object at the
     * specified index.
     */
    insertAt(idx: number, object: T): this;
    /**
     * Remove an object at the specified index using the `replace()` primitive
     * method. You can pass either a single index, or a start and a length.
     */
    removeAt(start: number, len?: number): this;
    /**
     * Add the objects in the passed numerable to the end of the array. Defers
     * notifying observers of the change until all objects are added.
     */
    pushObjects(objects: AnyArray<T>): this;
    /**
     * Adds the named objects to the beginning of the array. Defers notifying
     * observers until all objects have been added.
     */
    unshiftObjects(objects: AnyArray<T>): this;
    /**
     * Reverse objects in the array. Works just like `reverse()` but it is
     * KVO-compliant.
     */
    reverseObjects(): this;
    /**
     * Replace all the receiver's content with content of the argument.
     * If argument is an empty array receiver will be cleared.
     */
    setObjects(objects: AnyArray<T>): this;
    /**
    Remove all occurrences of an object in the array.

    ```javascript
    let cities = ['Chicago', 'Berlin', 'Lima', 'Chicago'];

    cities.removeObject('Chicago');  // ['Berlin', 'Lima']
    cities.removeObject('Lima');     // ['Berlin']
    cities.removeObject('Tokyo')     // ['Berlin']
    ```

    @method removeObject
    @param {*} obj object to remove
    @return {EmberArray} receiver
    @public
  */
    removeObject(object: T): this;
    /**
     * Removes each object in the passed array from the receiver.
     */
    removeObjects(objects: AnyArray<T>): this;
    /**
      Push the object onto the end of the array if it is not already
      present in the array.

      ```javascript
      let cities = ['Chicago', 'Berlin'];

      cities.addObject('Lima');    // ['Chicago', 'Berlin', 'Lima']
      cities.addObject('Berlin');  // ['Chicago', 'Berlin', 'Lima']
      ```

      @method addObject
      @param {*} obj object to add, if not already present
      @return {EmberArray} receiver
      @public
    */
    addObject(obj: T): this;
    /**
     * Adds each object in the passed enumerable to the receiver.
     */
    addObjects(objects: AnyArray<T>): this;
    /**
      Sets the value on the named property for each member. This is more
      ergonomic than using other methods defined on this helper. If the object
      implements Observable, the value will be changed to `set(),` otherwise
      it will be set directly. `null` objects are skipped.

      ```javascript
      let people = [{name: 'Joe'}, {name: 'Matt'}];

      people.setEach('zipCode', '10011');
      // [{name: 'Joe', zipCode: '10011'}, {name: 'Matt', zipCode: '10011'}];
      ```

      @method setEach
      @param {String} key The key to set
      @param {Object} value The object to set
      @return {Object} receiver
      @public
    */
    setEach<K extends keyof T>(key: K, value: T[K]): this;
    /**
      This is the handler for the special array content property. If you get
      this property, it will return this. If you set this property to a new
      array, it will replace the current content.

      ```javascript
      let peopleToMoon = ['Armstrong', 'Aldrin'];

      peopleToMoon.get('[]'); // ['Armstrong', 'Aldrin']

      peopleToMoon.set('[]', ['Collins']); // ['Collins']
      peopleToMoon.get('[]'); // ['Collins']
      ```

      @property []
      @return this
      @public
    */
    get '[]'(): this;
    set '[]'(newValue: T[] | this);
  }

  /**
   * The NativeArray mixin contains the properties needed to make the native
   * Array support Ember.MutableArray and all of its dependent APIs. Unless you
   * have `EmberENV.EXTEND_PROTOTYPES` or `EmberENV.EXTEND_PROTOTYPES.Array` set to
   * false, this will be applied automatically. Otherwise you can apply the mixin
   * at anytime by calling `Ember.NativeArray.apply(Array.prototype)`.
   */
  interface NativeArray<T> extends Array<T>, Observable, MutableArrayWithoutNative<T> {}

  const NativeArray: Mixin;
  export default NativeArray;
}
