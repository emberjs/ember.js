require('ember-metal/expand_properties');
require('ember-metal/computed');
require('ember-runtime/mixins/array');

var e_get = Ember.get,
    set = Ember.set,
    guidFor = Ember.guidFor,
    metaFor = Ember.meta,
    propertyWillChange = Ember.propertyWillChange,
    propertyDidChange = Ember.propertyDidChange,
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
    doubleEachPropertyPattern = /(.*\.@each){2,}/,
    arrayBracketPattern = /\.\[\]$/;

if (Ember.FEATURES.isEnabled('propertyBraceExpansion')) {
  var expandProperties = Ember.expandProperties;
}

function get(obj, key) {
  if (key === '@this') {
    return obj;
  }

  return e_get(obj, key);
}

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

  // We suspend observers to ignore replacements from `reset` when totally
  // recomputing.  Unfortunately we cannot properly suspend the observers
  // because we only have the key; instead we make the observers no-ops
  this.suspended = false;

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

  this.destroyed = false;
}

DependentArraysObserver.prototype = {
  setValue: function (newValue) {
    this.instanceMeta.setValue(newValue, true);
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

  suspendArrayObservers: function (callback, binding) {
    var oldSuspended = this.suspended;
    this.suspended = true;
    callback.call(binding);
    this.suspended = oldSuspended;
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
        observerContext.destroyed = true;
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
      return dependentArrayObserver.itemPropertyWillChange(obj, keyName, observerContext.dependentArray, observerContext);
    };
    observerContext.observer = function (obj, keyName) {
      return dependentArrayObserver.itemPropertyDidChange(obj, keyName, observerContext.dependentArray, observerContext);
    };
  },

  resetTransformations: function (dependentKey, observerContexts) {
    this.trackedArraysByGuid[dependentKey] = new Ember.TrackedArray(observerContexts);
  },

  trackAdd: function (dependentKey, index, newItems) {
    var trackedArray = this.trackedArraysByGuid[dependentKey];
    if (trackedArray) {
      trackedArray.addItems(index, newItems);
    }
  },

  trackRemove: function (dependentKey, index, removedCount) {
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
    if (this.suspended) { return; }

    var removedItem = this.callbacks.removedItem,
        changeMeta,
        guid = guidFor(dependentArray),
        dependentKey = this.dependentKeysByGuid[guid],
        itemPropertyKeys = this.cp._itemPropertyKeys[dependentKey] || [],
        length = get(dependentArray, 'length'),
        normalizedIndex = normalizeIndex(index, length, 0),
        normalizedRemoveCount = normalizeRemoveCount(normalizedIndex, length, removedCount),
        item,
        itemIndex,
        sliceIndex,
        observerContexts;

    observerContexts = this.trackRemove(dependentKey, normalizedIndex, normalizedRemoveCount);

    function removeObservers(propertyKey) {
      observerContexts[sliceIndex].destroyed = true;
      removeBeforeObserver(item, propertyKey, this, observerContexts[sliceIndex].beforeObserver);
      removeObserver(item, propertyKey, this, observerContexts[sliceIndex].observer);
    }

    for (sliceIndex = normalizedRemoveCount - 1; sliceIndex >= 0; --sliceIndex) {
      itemIndex = normalizedIndex + sliceIndex;
      if (itemIndex >= length) { break; }

      item = dependentArray.objectAt(itemIndex);

      forEach(itemPropertyKeys, removeObservers, this);

      changeMeta = createChangeMeta(dependentArray, item, itemIndex, this.instanceMeta.propertyName, this.cp);
      this.setValue( removedItem.call(
        this.instanceMeta.context, this.getValue(), item, changeMeta, this.instanceMeta.sugarMeta));
    }
  },

  dependentArrayDidChange: function (dependentArray, index, removedCount, addedCount) {
    if (this.suspended) { return; }

    var addedItem = this.callbacks.addedItem,
        guid = guidFor(dependentArray),
        dependentKey = this.dependentKeysByGuid[guid],
        observerContexts = new Array(addedCount),
        itemPropertyKeys = this.cp._itemPropertyKeys[dependentKey],
        length = get(dependentArray, 'length'),
        normalizedIndex = normalizeIndex(index, length, addedCount),
        changeMeta,
        observerContext;

    forEach(dependentArray.slice(normalizedIndex, normalizedIndex + addedCount), function (item, sliceIndex) {
      if (itemPropertyKeys) {
        observerContext =
          observerContexts[sliceIndex] =
          this.createPropertyObserverContext(dependentArray, normalizedIndex + sliceIndex, this.trackedArraysByGuid[dependentKey]);
        forEach(itemPropertyKeys, function (propertyKey) {
          addBeforeObserver(item, propertyKey, this, observerContext.beforeObserver);
          addObserver(item, propertyKey, this, observerContext.observer);
        }, this);
      }

      changeMeta = createChangeMeta(dependentArray, item, normalizedIndex + sliceIndex, this.instanceMeta.propertyName, this.cp);
      this.setValue( addedItem.call(
        this.instanceMeta.context, this.getValue(), item, changeMeta, this.instanceMeta.sugarMeta));
    }, this);

    this.trackAdd(dependentKey, normalizedIndex, observerContexts);
  },

  itemPropertyWillChange: function (obj, keyName, array, observerContext) {
    var guid = guidFor(obj);

    if (!this.changedItems[guid]) {
      this.changedItems[guid] = {
        array:            array,
        observerContext:  observerContext,
        obj:              obj,
        previousValues:   {}
      };
    }

    this.changedItems[guid].previousValues[keyName] = get(obj, keyName);
  },

  itemPropertyDidChange: function(obj, keyName, array, observerContext) {
    this.flushChanges();
  },

  flushChanges: function() {
    var changedItems = this.changedItems, key, c, changeMeta;

    for (key in changedItems) {
      c = changedItems[key];
      if (c.observerContext.destroyed) { continue; }

      this.updateIndexes(c.observerContext.trackedArray, c.observerContext.dependentArray);

      changeMeta = createChangeMeta(c.array, c.obj, c.observerContext.index, this.instanceMeta.propertyName, this.cp, c.previousValues);
      this.setValue(
        this.callbacks.removedItem.call(this.instanceMeta.context, this.getValue(), c.obj, changeMeta, this.instanceMeta.sugarMeta));
      this.setValue(
        this.callbacks.addedItem.call(this.instanceMeta.context, this.getValue(), c.obj, changeMeta, this.instanceMeta.sugarMeta));
    }
    this.changedItems = {};
  }
};

function normalizeIndex(index, length, newItemsOffset) {
  if (index < 0) {
    return Math.max(0, length + index);
  } else if (index < length) {
    return index;
  } else /* index > length */ {
    return Math.min(length - newItemsOffset, index);
  }
}

function normalizeRemoveCount(index, length, removedCount) {
  return Math.min(removedCount, length - index);
}

function createChangeMeta(dependentArray, item, index, propertyName, property, previousValues) {
  var meta = {
    arrayChanged: dependentArray,
    index: index,
    item: item,
    propertyName: propertyName,
    property: property
  };

  if (previousValues) {
    // previous values only available for item property changes
    meta.previousValues = previousValues;
  }

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

function partiallyRecomputeFor(obj, dependentKey) {
  if (arrayBracketPattern.test(dependentKey)) {
    return false;
  }

  var value = get(obj, dependentKey);
  return Ember.Array.detect(value);
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

  setValue: function(newValue, triggerObservers) {
    // This lets sugars force a recomputation, handy for very simple
    // implementations of eg max.
    if (newValue !== undefined) {
      var fireObservers = triggerObservers && (newValue !== this.cache[this.propertyName]);

      if (fireObservers) {
        propertyWillChange(this.context, this.propertyName);
      }

      this.cache[this.propertyName] = newValue;

      if (fireObservers) {
        propertyDidChange(this.context, this.propertyName);
      }
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

    meta.dependentArraysObserver.suspendArrayObservers(function () {
      forEach(cp._dependentKeys, function (dependentKey) {
        if (!partiallyRecomputeFor(this, dependentKey)) { return; }

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
    }, this);

    forEach(cp._dependentKeys, function(dependentKey) {
      if (!partiallyRecomputeFor(this, dependentKey)) { return; }

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
  if (typeof this.options.initialValue === 'function') {
    return this.options.initialValue();
  }
  else {
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
      propertyArgs = new Ember.Set(),
      match,
      dependentArrayKey,
      itemPropertyKey;

  forEach(a_slice.call(arguments), function (dependentKey) {
    if (doubleEachPropertyPattern.test(dependentKey)) {
      throw new Ember.Error("Nested @each properties not supported: " + dependentKey);
    } else if (match = eachPropertyPattern.exec(dependentKey)) {
      dependentArrayKey = match[1];

      if (Ember.FEATURES.isEnabled('propertyBraceExpansion')) {
        var itemPropertyKeyPattern = match[2],
            addItemPropertyKey = function (itemPropertyKey) {
              cp.itemPropertyKey(dependentArrayKey, itemPropertyKey);
            };

        expandProperties(itemPropertyKeyPattern, addItemPropertyKey);
      } else {
        itemPropertyKey = match[2];
        cp.itemPropertyKey(dependentArrayKey, itemPropertyKey);
      }
      propertyArgs.add(dependentArrayKey);
    } else {
      propertyArgs.add(dependentKey);
    }
  });

  return ComputedProperty.prototype.property.apply(this, propertyArgs.toArray());

};

/**
  Creates a computed property which operates on dependent arrays and
  is updated with "one at a time" semantics. When items are added or
  removed from the dependent array(s) a reduce computed only operates
  on the change instead of re-evaluating the entire array.

  If there are more than one arguments the first arguments are
  considered to be dependent property keys. The last argument is
  required to be an options object. The options object can have the
  following four properties:

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
  `changeMeta` will also contain the following property:

    - `previousValues` an object whose keys are the properties that changed on
    the item, and whose values are the item's previous values.

  `previousValues` is important Ember coalesces item property changes via
  Ember.run.once. This means that by the time removedItem gets called, item has
  the new values, but you may need the previous value (eg for sorting &
  filtering).

  `instanceMeta` - An object that can be used to store meta
  information needed for calculating your computed. For example a
  unique computed might use this to store the number of times a given
  element is found in the dependent array.

  The `removedItem` and `addedItem` functions should return the accumulated
  value. It is acceptable to not return anything (ie return undefined)
  to invalidate the computation. This is generally not a good idea for
  arrayComputed but it's used in eg max and min.

  Note that observers will be fired if either of these functions return a value
  that differs from the accumulated value.  When returning an object that
  mutates in response to array changes, for example an array that maps
  everything from some other array (see `Ember.computed.map`), it is usually
  important that the *same* array be returned to avoid accidentally triggering observers.

  Example

  ```javascript
  Ember.computed.max = function (dependentKey) {
    return Ember.reduceComputed(dependentKey, {
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

  Dependent keys may refer to `@this` to observe changes to the object itself,
  which must be array-like, rather than a property of the object.  This is
  mostly useful for array proxies, to ensure objects are retrieved via
  `objectAtContent`.  This is how you could sort items by properties defined on an item controller.

  Example

  ```javascript
  App.PeopleController = Ember.ArrayController.extend({
    itemController: 'person',

    sortedPeople: Ember.computed.sort('@this.@each.reversedName', function(personA, personB) {
      // `reversedName` isn't defined on Person, but we have access to it via
      // the item controller App.PersonController.  If we'd used
      // `content.@each.reversedName` above, we would be getting the objects
      // directly and not have access to `reversedName`.
      //
      var reversedNameA = get(personA, 'reversedName'),
          reversedNameB = get(personB, 'reversedName');

      return Ember.compare(reversedNameA, reversedNameB);
    })
  });

  App.PersonController = Ember.ObjectController.extend({
    reversedName: function () {
      return reverse(get(this, 'name'));
    }.property('name')
  })
  ```

  Dependent keys whose values are not arrays are treated as regular
  dependencies: when they change, the computed property is completely
  recalculated.  It is sometimes useful to have dependent arrays with similar
  semantics.  Dependent keys which end in `.[]` do not use "one at a time"
  semantics.  When an item is added or removed from such a dependency, the
  computed property is completely recomputed.

  Example

  ```javascript
  Ember.Object.extend({
    // When `string` is changed, `computed` is completely recomputed.
    string: 'a string',

    // When an item is added to `array`, `addedItem` is called.
    array: [],

    // When an item is added to `anotherArray`, `computed` is completely
    // recomputed.
    anotherArray: [],

    computed: Ember.reduceComputed('string', 'array', 'anotherArray.[]', {
      addedItem: addedItemCallback,
      removedItem: removedItemCallback
    })
  });
  ```

  @method reduceComputed
  @for Ember
  @param {String} [dependentKeys*]
  @param {Object} options
  @return {Ember.ComputedProperty}
*/
Ember.reduceComputed = function (options) {
  var args;

  if (arguments.length > 1) {
    args = a_slice.call(arguments, 0, -1);
    options = a_slice.call(arguments, -1)[0];
  }

  if (typeof options !== "object") {
    throw new Ember.Error("Reduce Computed Property declared without an options hash");
  }

  if (!('initialValue' in options)) {
    throw new Ember.Error("Reduce Computed Property declared without an initial value");
  }

  var cp = new ReduceComputedProperty(options);

  if (args) {
    cp.property.apply(cp, args);
  }

  return cp;
};
