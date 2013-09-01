require('ember-metal/computed');
require('ember-runtime/mixins/array');

var get = Ember.get,
    set = Ember.set,
    guidFor = Ember.guidFor,
    metaFor = Ember.meta,
    addBeforeObserver = Ember.addBeforeObserver,
    removeBeforeObserver = Ember.removeBeforeObserver,
    addObserver = Ember.addObserver,
    removeObserver = Ember.removeObserver,
    ComputedProperty = Ember.ComputedProperty,
    a_slice = [].slice,
    o_create = Ember.create,
    forEach = Ember.EnumerableUtils.forEach,
    // Here we explicitly don't allow `@each.foo`; it would require some special
    // testing, but there's no particular reason why it should be disallowed.
    eachPropertyPattern = /^(.*)\.@each\.(.*)/,
    doubleEachPropertyPattern = /(.*\.@each){2,}/;

/*
  Tracks changes to dependent arrays, as well as to properties of items in
  dependent arrays.

  @class DependentArraysObserver
*/
function DependentArraysObserver(callbacks, cp, instanceMeta, context, propertyName, sugarMeta) {
  // user specified callbacks for `addedItem` and `removedItem`
  this.callbacks = callbacks;

  // the computed property: remember these are shared across instances
  this.cp = cp;

  // the ReduceComputedPropertyInstanceMeta this DependentArraysObserver is
  // associated with
  this.instanceMeta = instanceMeta;

  // A map of array guids to dependentKeys, for the given context.  We track
  // this because we want to set up the computed property potentially before the
  // dependent array even exists, but when the array observer fires, we lack
  // enough context to know what to update: we can recover that context by
  // getting the dependentKey.
  this.dependentKeysByGuid = {};

  // a map of dependent array guids -> Ember.TrackedArray instances.  We use
  // this to lazily recompute indexes for item property observers.
  this.trackedArraysByGuid = {};

  // This is used to coalesce item changes from property observers.
  this.changedItems = {};
}

function ItemPropertyObserverContext (dependentArray, index, trackedArray) {
  Ember.assert("Internal error: trackedArray is null or undefined", trackedArray);

  this.dependentArray = dependentArray;
  this.index = index;
  this.item = dependentArray.objectAt(index);
  this.trackedArray = trackedArray;
  this.beforeObserver = null;
  this.observer = null;
}

DependentArraysObserver.prototype = {
  setValue: function (newValue) {
    this.instanceMeta.setValue(newValue);
  },
  getValue: function () {
    return this.instanceMeta.getValue();
  },

  setupObservers: function (dependentArray, dependentKey) {
    Ember.assert("dependent array must be an `Ember.Array`", Ember.Array.detect(dependentArray));

    this.dependentKeysByGuid[guidFor(dependentArray)] = dependentKey;

    dependentArray.addArrayObserver(this, {
      willChange: 'dependentArrayWillChange',
      didChange: 'dependentArrayDidChange'
    });

    if (this.cp._itemPropertyKeys[dependentKey]) {
      this.setupPropertyObservers(dependentKey, this.cp._itemPropertyKeys[dependentKey]);
    }
  },

  teardownObservers: function (dependentArray, dependentKey) {
    var itemPropertyKeys = this.cp._itemPropertyKeys[dependentKey] || [];

    delete this.dependentKeysByGuid[guidFor(dependentArray)];

    this.teardownPropertyObservers(dependentKey, itemPropertyKeys);

    dependentArray.removeArrayObserver(this, {
      willChange: 'dependentArrayWillChange',
      didChange: 'dependentArrayDidChange'
    });
  },

  setupPropertyObservers: function (dependentKey, itemPropertyKeys) {
    var dependentArray = get(this.instanceMeta.context, dependentKey),
        length = get(dependentArray, 'length'),
        observerContexts = new Array(length);

    this.resetTransformations(dependentKey, observerContexts);

    forEach(dependentArray, function (item, index) {
      var observerContext = this.createPropertyObserverContext(dependentArray, index, this.trackedArraysByGuid[dependentKey]);
      observerContexts[index] = observerContext;

      forEach(itemPropertyKeys, function (propertyKey) {
        addBeforeObserver(item, propertyKey, this, observerContext.beforeObserver);
        addObserver(item, propertyKey, this, observerContext.observer);
      }, this);
    }, this);
  },

  teardownPropertyObservers: function (dependentKey, itemPropertyKeys) {
    var dependentArrayObserver = this,
        trackedArray = this.trackedArraysByGuid[dependentKey],
        beforeObserver,
        observer,
        item;

    if (!trackedArray) { return; }

    trackedArray.apply(function (observerContexts, offset, operation) {
      if (operation === Ember.TrackedArray.DELETE) { return; }

      forEach(observerContexts, function (observerContext) {
        beforeObserver = observerContext.beforeObserver;
        observer = observerContext.observer;
        item = observerContext.item;

        forEach(itemPropertyKeys, function (propertyKey) {
          removeBeforeObserver(item, propertyKey, dependentArrayObserver, beforeObserver);
          removeObserver(item, propertyKey, dependentArrayObserver, observer);
        });
      });
    });
  },

  createPropertyObserverContext: function (dependentArray, index, trackedArray) {
    var observerContext = new ItemPropertyObserverContext(dependentArray, index, trackedArray);

    this.createPropertyObserver(observerContext);

    return observerContext;
  },

  createPropertyObserver: function (observerContext) {
    var dependentArrayObserver = this;

    observerContext.beforeObserver = function (obj, keyName) {
      dependentArrayObserver.updateIndexes(observerContext.trackedArray, observerContext.dependentArray);
      return dependentArrayObserver.itemPropertyWillChange(obj, keyName, observerContext.dependentArray, observerContext.index);
    };
    observerContext.observer = function (obj, keyName) {
      return dependentArrayObserver.itemPropertyDidChange(obj, keyName, observerContext.dependentArray, observerContext.index);
    };
  },

  resetTransformations: function (dependentKey, observerContexts) {
    this.trackedArraysByGuid[dependentKey] = new Ember.TrackedArray(observerContexts);
  },

  addTransformation: function (dependentKey, index, newItems) {
    var trackedArray = this.trackedArraysByGuid[dependentKey];
    if (trackedArray) {
      trackedArray.addItems(index, newItems);
    }
  },

  removeTransformation: function (dependentKey, index, removedCount) {
    var trackedArray = this.trackedArraysByGuid[dependentKey];

    if (trackedArray) {
      return trackedArray.removeItems(index, removedCount);
    }

    return [];
  },

  updateIndexes: function (trackedArray, array) {
    var length = get(array, 'length');
    // OPTIMIZE: we could stop updating once we hit the object whose observer
    // fired; ie partially apply the transformations
    trackedArray.apply(function (observerContexts, offset, operation) {
      // we don't even have observer contexts for removed items, even if we did,
      // they no longer have any index in the array
      if (operation === Ember.TrackedArray.DELETE) { return; }
      if (operation === Ember.TrackedArray.RETAIN && observerContexts.length === length && offset === 0) {
        // If we update many items we don't want to walk the array each time: we
        // only need to update the indexes at most once per run loop.
        return;
      }

      forEach(observerContexts, function (context, index) {
        context.index = index + offset;
      });
    });
  },

  dependentArrayWillChange: function (dependentArray, index, removedCount, addedCount) {
    var removedItem = this.callbacks.removedItem,
        changeMeta,
        guid = guidFor(dependentArray),
        dependentKey = this.dependentKeysByGuid[guid],
        itemPropertyKeys = this.cp._itemPropertyKeys[dependentKey] || [],
        item,
        itemIndex,
        sliceIndex,
        observerContexts;

    observerContexts = this.removeTransformation(dependentKey, index, removedCount);


    function removeObservers(propertyKey) {
      removeBeforeObserver(item, propertyKey, this, observerContexts[sliceIndex].beforeObserver);
      removeObserver(item, propertyKey, this, observerContexts[sliceIndex].observer);
    }

    for (sliceIndex = removedCount - 1; sliceIndex >= 0; --sliceIndex) {
      itemIndex = index + sliceIndex;
      item = dependentArray.objectAt(itemIndex);
      
      forEach(itemPropertyKeys, removeObservers, this);

      changeMeta = createChangeMeta(dependentArray, item, itemIndex, this.instanceMeta.propertyName, this.cp);
      this.setValue( removedItem.call(
        this.instanceMeta.context, this.getValue(), item, changeMeta, this.instanceMeta.sugarMeta));
    }
  },

  dependentArrayDidChange: function (dependentArray, index, removedCount, addedCount) {
    var addedItem = this.callbacks.addedItem,
        guid = guidFor(dependentArray),
        dependentKey = this.dependentKeysByGuid[guid],
        observerContexts = new Array(addedCount),
        itemPropertyKeys = this.cp._itemPropertyKeys[dependentKey],
        changeMeta,
        observerContext;

    forEach(dependentArray.slice(index, index + addedCount), function (item, sliceIndex) {
      if (itemPropertyKeys) {
        observerContext = 
          observerContexts[sliceIndex] = 
          this.createPropertyObserverContext(dependentArray, index + sliceIndex, this.trackedArraysByGuid[dependentKey]);
        forEach(itemPropertyKeys, function (propertyKey) {
          addBeforeObserver(item, propertyKey, this, observerContext.beforeObserver);
          addObserver(item, propertyKey, this, observerContext.observer);
        }, this);
      }

      changeMeta = createChangeMeta(dependentArray, item, index + sliceIndex, this.instanceMeta.propertyName, this.cp);
      this.setValue( addedItem.call(
        this.instanceMeta.context, this.getValue(), item, changeMeta, this.instanceMeta.sugarMeta));
    }, this);

    this.addTransformation(dependentKey, index, observerContexts);
  },

  itemPropertyWillChange: function (obj, keyName, array, index) {
    var changeId = guidFor(obj)+":"+keyName;

    if (!this.changedItems[changeId]) {
      this.changedItems[changeId] = {
        array:          array,  
        index:          index,
        obj:            obj,
        keyChanged:     keyName,
        previousValue:  get(obj, keyName)
      };
    }
  },

  itemPropertyDidChange: function(obj, keyName, array, index) {
    Ember.run.once(this, 'flushChanges');
  },

  flushChanges: function() {
    var changedItems = this.changedItems, key, c, changeMeta;
    for (key in changedItems) {
      c = changedItems[key];
      changeMeta = createChangeMeta(c.array, c.obj, c.index, this.instanceMeta.propertyName, this.cp, c.keyChanged, c.previousValue);
      this.setValue(
        this.callbacks.removedItem.call(this.instanceMeta.context, this.getValue(), c.obj, changeMeta, this.instanceMeta.sugarMeta));
      this.setValue(
        this.callbacks.addedItem.call(this.instanceMeta.context, this.getValue(), c.obj, changeMeta, this.instanceMeta.sugarMeta));
    }
    this.changedItems = {};
  }
};

function createChangeMeta(dependentArray, item, index, propertyName, property, key, previousValue) {
  var meta = {
    arrayChanged: dependentArray,
    index: index,
    item: item,
    propertyName: propertyName,
    property: property,
    // previous value is only available for item property changes!
    previousValue: previousValue
  };

  if (key) { meta.keyChanged = key; }

  return meta;
}

function addItems (dependentArray, callbacks, cp, propertyName, meta) {
  forEach(dependentArray, function (item, index) {
    meta.setValue( callbacks.addedItem.call(
      this, meta.getValue(), item, createChangeMeta(dependentArray, item, index, propertyName, cp), meta.sugarMeta));
  }, this);
}

function reset(cp, propertyName) {
  var callbacks = cp._callbacks(),
      meta;

  if (cp._hasInstanceMeta(this, propertyName)) {
    meta = cp._instanceMeta(this, propertyName);
    meta.setValue(cp.resetValue(meta.getValue()));
  } else {
    meta = cp._instanceMeta(this, propertyName);
  }

  if (cp.options.initialize) {
    cp.options.initialize.call(this, meta.getValue(), { property: cp, propertyName: propertyName }, meta.sugarMeta);
  }
}

function ReduceComputedPropertyInstanceMeta(context, propertyName, initialValue) {
  this.context = context;
  this.propertyName = propertyName;
  this.cache = metaFor(context).cache;

  this.dependentArrays = {};
  this.sugarMeta = {};

  this.initialValue = initialValue;
}

ReduceComputedPropertyInstanceMeta.prototype = {
  getValue: function () {
    if (this.propertyName in this.cache) {
      return this.cache[this.propertyName];
    } else {
      return this.initialValue;
    }
  },

  setValue: function(newValue) {
    // This lets sugars force a recomputation, handy for very simple
    // implementations of eg max.
    if (newValue !== undefined) {
      this.cache[this.propertyName] = newValue;
    } else {
      delete this.cache[this.propertyName];
    }
  }
};

/**
  A computed property whose dependent keys are arrays and which is updated with
  "one at a time" semantics.

  @class ReduceComputedProperty
  @namespace Ember
  @extends Ember.ComputedProperty
  @constructor
*/
function ReduceComputedProperty(options) {
  var cp = this;

  this.options = options;
  this._instanceMetas = {};

  this._dependentKeys = null;
  // A map of dependentKey -> [itemProperty, ...] that tracks what properties of
  // items in the array we must track to update this property.
  this._itemPropertyKeys = {};
  this._previousItemPropertyKeys = {};

  this.readOnly();
  this.cacheable();

  this.recomputeOnce = function(propertyName) {
    // What we really want to do is coalesce by <cp, propertyName>.
    // We need a form of `scheduleOnce` that accepts an arbitrary token to
    // coalesce by, in addition to the target and method.
    Ember.run.once(this, recompute, propertyName);
  };
  var recompute = function(propertyName) {
    var dependentKeys = cp._dependentKeys,
        meta = cp._instanceMeta(this, propertyName),
        callbacks = cp._callbacks();

    reset.call(this, cp, propertyName);

    forEach(cp._dependentKeys, function (dependentKey) {
      var dependentArray = get(this, dependentKey),
          previousDependentArray = meta.dependentArrays[dependentKey];

      if (dependentArray === previousDependentArray) {
        // The array may be the same, but our item property keys may have
        // changed, so we set them up again.  We can't easily tell if they've
        // changed: the array may be the same object, but with different
        // contents.
        if (cp._previousItemPropertyKeys[dependentKey]) {
          delete cp._previousItemPropertyKeys[dependentKey];
          meta.dependentArraysObserver.setupPropertyObservers(dependentKey, cp._itemPropertyKeys[dependentKey]);
        }
      } else {
        meta.dependentArrays[dependentKey] = dependentArray;

        if (previousDependentArray) {
          meta.dependentArraysObserver.teardownObservers(previousDependentArray, dependentKey);
        }

        if (dependentArray) {
          meta.dependentArraysObserver.setupObservers(dependentArray, dependentKey);
        }
      }
    }, this);

    forEach(cp._dependentKeys, function(dependentKey) {
      var dependentArray = get(this, dependentKey);
      if (dependentArray) {
        addItems.call(this, dependentArray, callbacks, cp, propertyName, meta);
      }
    }, this);
  };

  this.func = function (propertyName) {
    Ember.assert("Computed reduce values require at least one dependent key", cp._dependentKeys);

    recompute.call(this, propertyName);

    return cp._instanceMeta(this, propertyName).getValue();
  };
}

Ember.ReduceComputedProperty = ReduceComputedProperty;
ReduceComputedProperty.prototype = o_create(ComputedProperty.prototype);

function defaultCallback(computedValue) {
  return computedValue;
}

ReduceComputedProperty.prototype._callbacks = function () {
  if (!this.callbacks) {
    var options = this.options;
    this.callbacks = {
      removedItem: options.removedItem || defaultCallback,
      addedItem: options.addedItem || defaultCallback
    };
  }
  return this.callbacks;
};

ReduceComputedProperty.prototype._hasInstanceMeta = function (context, propertyName) {
  var guid = guidFor(context),
      key = guid + ':' + propertyName;

  return !!this._instanceMetas[key];
};

ReduceComputedProperty.prototype._instanceMeta = function (context, propertyName) {
  var guid = guidFor(context),
      key = guid + ':' + propertyName,
      meta = this._instanceMetas[key];

  if (!meta) {
    meta = this._instanceMetas[key] = new ReduceComputedPropertyInstanceMeta(context, propertyName, this.initialValue());
    meta.dependentArraysObserver = new DependentArraysObserver(this._callbacks(), this, meta, context, propertyName, meta.sugarMeta);
  }

  return meta;
};

ReduceComputedProperty.prototype.initialValue = function () {
  switch (typeof this.options.initialValue) {
    case 'undefined':
      throw new Error("reduce computed properties require an initial value: did you forget to pass one to Ember.reduceComputed?");
    case  'function':
      return this.options.initialValue();
    default:
      return this.options.initialValue;
  }
};

ReduceComputedProperty.prototype.resetValue = function (value) {
  return this.initialValue();
};

ReduceComputedProperty.prototype.itemPropertyKey = function (dependentArrayKey, itemPropertyKey) {
  this._itemPropertyKeys[dependentArrayKey] = this._itemPropertyKeys[dependentArrayKey] || [];
  this._itemPropertyKeys[dependentArrayKey].push(itemPropertyKey);
};

ReduceComputedProperty.prototype.clearItemPropertyKeys = function (dependentArrayKey) {
  if (this._itemPropertyKeys[dependentArrayKey]) {
    this._previousItemPropertyKeys[dependentArrayKey] = this._itemPropertyKeys[dependentArrayKey];
    this._itemPropertyKeys[dependentArrayKey] = [];
  }
};

ReduceComputedProperty.prototype.property = function () {
  var cp = this,
      args = a_slice.call(arguments),
      propertyArgs = [],
      match,
      dependentArrayKey,
      itemPropertyKey;

  forEach(a_slice.call(arguments), function (dependentKey) {
    if (doubleEachPropertyPattern.test(dependentKey)) {
      throw new Error("Nested @each properties not supported: " + dependentKey);
    } else if (match = eachPropertyPattern.exec(dependentKey)) {
      dependentArrayKey = match[1];
      itemPropertyKey = match[2];
      cp.itemPropertyKey(dependentArrayKey, itemPropertyKey);
      propertyArgs.push(dependentArrayKey);
    } else {
      propertyArgs.push(dependentKey);
    }
  });

  return ComputedProperty.prototype.property.apply(this, propertyArgs);
};

/**
  Creates a computed property which operates on dependent arrays and
  is updated with "one at a time" semantics. When items are added or
  removed from the dependent array(s) a reduce computed only operates
  on the change instead of re-evaluating the entire array.

  If there are more than one arguments the first arguments are
  considered to be dependent property keys. The last argument is
  required to be an options object. The options object can have the
  following four properties.

  `initialValue` - A value or function that will be used as the initial
  value for the computed. If this property is a function the result of calling
  the function will be used as the initial value. This property is required.

  `initialize` - An optional initialize function. Typically this will be used
  to set up state on the instanceMeta object.

  `removedItem` - A function that is called each time an element is removed
  from the array.

  `addedItem` - A function that is called each time an element is added to
  the array.


  The `initialize` function has the following signature:

  ```javascript
   function (initialValue, changeMeta, instanceMeta)
  ```

  `initialValue` - The value of the `initialValue` property from the
  options object.

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
  `removedItem` or `addedItem` was called or `initialValue`.

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
  Ember.computed.max = function (dependentKey) {
    return Ember.reduceComputed.call(null, dependentKey, {
      initialValue: -Infinity,

      addedItem: function (accumulatedValue, item, changeMeta, instanceMeta) {
        return Math.max(accumulatedValue, item);
      },

      removedItem: function (accumulatedValue, item, changeMeta, instanceMeta) {
        if (item < accumulatedValue) {
          return accumulatedValue;
        }
      }
    });
  };
  ```

  @method reduceComputed
  @for Ember
  @param {String} [dependentKeys*]
  @param {Object} options
  @returns {Ember.ComputedProperty}
*/
Ember.reduceComputed = function (options) {
  var args;

  if (arguments.length > 1) {
    args = a_slice.call(arguments, 0, -1);
    options = a_slice.call(arguments, -1)[0];
  }

  if (typeof options !== "object") {
    throw new Error("Reduce Computed Property declared without an options hash");
  }

  if (!options.initialValue) {
    throw new Error("Reduce Computed Property declared without an initial value");
  }

  var cp = new ReduceComputedProperty(options);

  if (args) {
    cp.property.apply(cp, args);
  }

  return cp;
};
