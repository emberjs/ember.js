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
