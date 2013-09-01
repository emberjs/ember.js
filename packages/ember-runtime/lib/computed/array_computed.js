require('ember-metal/computed');
require('ember-runtime/mixins/array');
require('ember-runtime/computed/reduce_computed');

var ReduceComputedProperty = Ember.ReduceComputedProperty,
    a_slice = [].slice,
    o_create = Ember.create,
    forEach = Ember.EnumerableUtils.forEach;

function ArrayComputedProperty() {
  var cp = this;

  ReduceComputedProperty.apply(this, arguments);

  this.func = (function(reduceFunc) {
    return function (propertyName) {
      if (!cp._hasInstanceMeta(this, propertyName)) {
        // When we recompute an array computed property, we need already
        // retrieved arrays to be updated; we can't simply empty the cache and
        // hope the array is re-retrieved.
        forEach(cp._dependentKeys, function(dependentKey) {
          Ember.addObserver(this, dependentKey, function() {
            cp.recomputeOnce.call(this, propertyName);
          });
        }, this);
      }

      return reduceFunc.apply(this, arguments);
    };
  })(this.func);

  return this;
}
Ember.ArrayComputedProperty = ArrayComputedProperty;
ArrayComputedProperty.prototype = o_create(ReduceComputedProperty.prototype);
ArrayComputedProperty.prototype.initialValue = function () {
  return Ember.A();
};
ArrayComputedProperty.prototype.resetValue = function (array) {
  array.clear();
  return array;
};

/**
  Creates a computed property which operates on dependent arrays and
  is updated with "one at a time" semantics. When items are added or
  removed from the dependent array(s) an array computed only operates
  on the change instead of re-evaluating the entire array. This should
  return an array, if you'd like to use "one at a time" semantics and
  compute some value other then an array look at
  `Ember.reduceComputed`.

  If there are more than one arguments the first arguments are
  considered to be dependent property keys. The last argument is
  required to be an options object. The options object can have the
  following three properties.

  `initialize` - An optional initialize function. Typically this will be used
  to set up state on the instanceMeta object.

  `removedItem` - A function that is called each time an element is
  removed from the array.

  `addedItem` - A function that is called each time an element is
  added to the array.


  The `initialize` function has the following signature:

  ```javascript
   function (array, changeMeta, instanceMeta)
  ```

  `array` - The initial value of the arrayComputed, an empty array.

  `changeMeta` - An object which contains meta information about the
  computed. It contains the following properties:

     - `property` the computed property
     - `propertyName` the name of the property on the object

  `instanceMeta` - An object that can be used to store meta
  information needed for calculating your computed. For example a
  unique computed might use this to store the number of times a given
  element is found in the dependent array.


  The `removedItem` and `addedItem` functions both have the following signature:

  ```javascript
  function (accumulatedValue, item, changeMeta, instanceMeta)
  ```

  `accumulatedValue` - The value returned from the last time
  `removedItem` or `addedItem` was called or an empty array.

  `item` - the element added or removed from the array

  `changeMeta` - An object which contains meta information about the
  change. It contains the following properties:

    - `property` the computed property
    - `propertyName` the name of the property on the object
    - `index` the index of the added or removed item
    - `item` the added or removed item: this is exactly the same as
      the second arg
    - `arrayChanged` the array that triggered the change. Can be
      useful when depending on multiple arrays.

  For property changes triggered on an item property change (when
  depKey is something like `someArray.@each.someProperty`),
  `changeMeta` may also contain the followng properties:

    - `keyChanged` the name of the property on the item that changed
    - `previousValue` the previous value of item.get(keyChanged)

  These properties are important because Ember coalesces item
  property changes via Ember.run.once. This means that by the time
  removedItem gets called, item has the new value, but you may need
  the previous value (eg for sorting & filtering).

  `instanceMeta` - An object that can be used to store meta
  information needed for calculating your computed. For example a
  unique computed might use this to store the number of times a given
  element is found in the dependent array.

  The `removedItem` and `addedItem` functions should return the accumulated
  value. It is acceptable to not return anything (ie return undefined)
  to invalidate the computation. This is generally not a good idea for
  arrayComputed but it's used in eg max and min.

  Example

  ```javascript
  Ember.computed.map = function(dependentKey, callback) {
    var options = {
      addedItem: function(array, item, changeMeta, instanceMeta) {
        var mapped = callback(item);
        array.insertAt(changeMeta.index, mapped);
        return array;
      },
      removedItem: function(array, item, changeMeta, instanceMeta) {
        array.removeAt(changeMeta.index, 1);
        return array;
      }
    };

    return Ember.arrayComputed(dependentKey, options);
  };
  ```

  @method arrayComputed
  @for Ember
  @param {String} [dependentKeys*]
  @param {Object} options
  @returns {Ember.ComputedProperty}
*/
Ember.arrayComputed = function (options) {
  var args;

  if (arguments.length > 1) {
    args = a_slice.call(arguments, 0, -1);
    options = a_slice.call(arguments, -1)[0];
  }

  if (typeof options !== "object") {
    throw new Error("Array Computed Property declared without an options hash");
  }

  var cp = new ArrayComputedProperty(options);

  if (args) {
    cp.property.apply(cp, args);
  }

  return cp;
};
