import { context } from 'ember-environment';
import { get, computed, run, observer } from 'ember-metal';
import { w } from '../../../../system/string';
import EmberObject from '../../../../system/object';
import Observable from '../../../../mixins/observable';
import { A as emberA } from '../../../../system/native_array';

/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.

  CHANGES FROM 1.6:

  * Added ObservableObject which applies the Ember.Observable mixin.
  * Changed reference to Ember.T_FUNCTION to 'function'
  * Changed all references to sc_super to this._super(...arguments)
  * Changed Ember.objectForPropertyPath() to Ember.getPath()
  * Removed allPropertiesDidChange test - no longer supported
  * Changed test that uses 'ObjectE' as path to 'objectE' to reflect new
    rule on using capital letters for property paths.
  * Removed test passing context to addObserver.  context param is no longer
    supported.
  * Changed calls to Ember.Binding.flushPendingChanges() -> run.sync()
  * removed test in observer around line 862 that expected key/value to be
    the last item in the chained path.  Should be root and chained path

*/

// ========================================================================
// Ember.Observable Tests
// ========================================================================

var object, ObjectC, ObjectD, objectA, objectB, lookup;

var ObservableObject = EmberObject.extend(Observable);
var originalLookup = context.lookup;

// ..........................................................
// GET()
//

QUnit.module('object.get()', {

  setup() {
    object = ObservableObject.extend(Observable, {
      computed: computed(function() { return 'value'; }).volatile(),
      method() { return 'value'; },
      unknownProperty(key, value) {
        this.lastUnknownProperty = key;
        return 'unknown';
      }
    }).create({
      normal: 'value',
      numberVal: 24,
      toggleVal: true,
      nullProperty: null
    });
  }

});

QUnit.test('should get normal properties', function() {
  equal(object.get('normal'), 'value');
});

QUnit.test('should call computed properties and return their result', function() {
  equal(object.get('computed'), 'value');
});

QUnit.test('should return the function for a non-computed property', function() {
  var value = object.get('method');
  equal(typeof value, 'function');
});

QUnit.test('should return null when property value is null', function() {
  equal(object.get('nullProperty'), null);
});

QUnit.test('should call unknownProperty when value is undefined', function() {
  equal(object.get('unknown'), 'unknown');
  equal(object.lastUnknownProperty, 'unknown');
});

// ..........................................................
// Ember.GET()
//
QUnit.module('Ember.get()', {
  setup() {
    objectA = ObservableObject.extend({
      computed: computed(function() { return 'value'; }).volatile(),
      method() { return 'value'; },
      unknownProperty(key, value) {
        this.lastUnknownProperty = key;
        return 'unknown';
      }
    }).create({
      normal: 'value',
      numberVal: 24,
      toggleVal: true,
      nullProperty: null
    });

    objectB = {
      normal: 'value',
      nullProperty: null
    };
  }
});

QUnit.test('should get normal properties on Ember.Observable', function() {
  equal(get(objectA, 'normal'), 'value');
});

QUnit.test('should call computed properties on Ember.Observable and return their result', function() {
  equal(get(objectA, 'computed'), 'value');
});

QUnit.test('should return the function for a non-computed property on Ember.Observable', function() {
  var value = get(objectA, 'method');
  equal(typeof value, 'function');
});

QUnit.test('should return null when property value is null on Ember.Observable', function() {
  equal(get(objectA, 'nullProperty'), null);
});

QUnit.test('should call unknownProperty when value is undefined on Ember.Observable', function() {
  equal(get(objectA, 'unknown'), 'unknown');
  equal(objectA.lastUnknownProperty, 'unknown');
});

QUnit.test('should get normal properties on standard objects', function() {
  equal(get(objectB, 'normal'), 'value');
});

QUnit.test('should return null when property is null on standard objects', function() {
  equal(get(objectB, 'nullProperty'), null);
});

/*
QUnit.test("raise if the provided object is null", function() {
  throws(function() {
    get(null, 'key');
  });
});
*/

QUnit.test('raise if the provided object is undefined', function() {
  expectAssertion(function() {
    get(undefined, 'key');
  }, /Cannot call get with 'key' on an undefined object/i);
});

QUnit.module('Ember.get() with paths');

QUnit.test('should return a property at a given path relative to the passed object', function() {
  var foo = ObservableObject.create({
    bar: ObservableObject.extend({
      baz: computed(function() { return 'blargh'; }).volatile()
    }).create()
  });

  equal(get(foo, 'bar.baz'), 'blargh');
});

QUnit.test('should return a property at a given path relative to the passed object - JavaScript hash', function() {
  var foo = {
    bar: {
      baz: 'blargh'
    }
  };

  equal(get(foo, 'bar.baz'), 'blargh');
});

// ..........................................................
// SET()
//

QUnit.module('object.set()', {

  setup() {
    object = ObservableObject.extend({
      computed: computed({
        get(key) {
          return this._computed;
        },
        set(key, value) {
          this._computed = value;
          return this._computed;
        }
      }).volatile(),

      method(key, value) {
        if (value !== undefined) {
          this._method = value;
        }
        return this._method;
      },

      unknownProperty(key) {
        return this._unknown;
      },

      setUnknownProperty(key, value) {
        this._unknown = value;
        return this._unknown;
      },

      // normal property
      normal: 'value',

      // computed property
      _computed: 'computed',
      // method, but not a property
      _method: 'method',
      // null property
      nullProperty: null,

      // unknown property
      _unknown: 'unknown'
    }).create();
  }

});

QUnit.test('should change normal properties and return the value', function() {
  var ret = object.set('normal', 'changed');
  equal(object.get('normal'), 'changed');
  equal(ret, 'changed');
});

QUnit.test('should call computed properties passing value and return the value', function() {
  var ret = object.set('computed', 'changed');
  equal(object.get('_computed'), 'changed');
  equal(ret, 'changed');
});

QUnit.test('should change normal properties when passing undefined', function() {
  var ret = object.set('normal', undefined);
  equal(object.get('normal'), undefined);
  equal(ret, undefined);
});

QUnit.test('should replace the function for a non-computed property and return the value', function() {
  var ret = object.set('method', 'changed');
  equal(object.get('_method'), 'method'); // make sure this was NOT run
  ok(typeof object.get('method') !== 'function');
  equal(ret, 'changed');
});

QUnit.test('should replace prover when property value is null', function() {
  var ret = object.set('nullProperty', 'changed');
  equal(object.get('nullProperty'), 'changed');
  equal(ret, 'changed');
});

QUnit.test('should call unknownProperty with value when property is undefined', function() {
  var ret = object.set('unknown', 'changed');
  equal(object.get('_unknown'), 'changed');
  equal(ret, 'changed');
});

// ..........................................................
// COMPUTED PROPERTIES
//

QUnit.module('Computed properties', {
  setup() {
    lookup = context.lookup = {};

    object = ObservableObject.extend({
      computed: computed({
        get() {
          this.computedCalls.push('getter-called');
          return 'computed';
        },
        set(key, value) {
          this.computedCalls.push(value);
        }
      }).volatile(),

      computedCached: computed({
        get() {
          this.computedCachedCalls.push('getter-called');
          return 'computedCached';
        },
        set: function(key, value) {
          this.computedCachedCalls.push(value);
        }
      }),

      dependent: computed({
        get() {
          this.dependentCalls.push('getter-called');
          return 'dependent';
        },
        set(key, value) {
          this.dependentCalls.push(value);
        }
      }).property('changer').volatile(),
      dependentFront: computed('changer', {
        get() {
          this.dependentFrontCalls.push('getter-called');
          return 'dependentFront';
        },
        set(key, value) {
          this.dependentFrontCalls.push(value);
        }
      }).volatile(),
      dependentCached: computed({
        get() {
          this.dependentCachedCalls.push('getter-called!');
          return 'dependentCached';
        },
        set(key, value) {
          this.dependentCachedCalls.push(value);
        }
      }).property('changer'),

      inc: computed('changer', function() {
        return this.incCallCount++;
      }),

      nestedInc: computed(function(key) {
        get(this, 'inc');
        return this.nestedIncCallCount++;
      }).property('inc'),

      isOn: computed({
        get() {
          return this.get('state') === 'on';
        },
        set(key, value) {
          this.set('state', 'on');
          return this.get('state') === 'on';
        }
      }).property('state').volatile(),

      isOff: computed({
        get() {
          return this.get('state') === 'off';
        },
        set(key, value) {
          this.set('state', 'off');
          return this.get('state') === 'off';
        }
      }).property('state').volatile()

    }).create({
      computedCalls: [],
      computedCachedCalls: [],
      changer: 'foo',
      dependentCalls: [],
      dependentFrontCalls: [],
      dependentCachedCalls: [],
      incCallCount: 0,
      nestedIncCallCount: 0,
      state: 'on'
    });
  },
  teardown() {
    context.lookup = originalLookup;
  }
});

QUnit.test('getting values should call function return value', function() {
  // get each property twice. Verify return.
  var keys = w('computed computedCached dependent dependentFront dependentCached');

  keys.forEach(function(key) {
    equal(object.get(key), key, `Try #1: object.get(${key}) should run function`);
    equal(object.get(key), key, `Try #2: object.get(${key}) should run function`);
  });

  // verify each call count.  cached should only be called once
  w('computedCalls dependentFrontCalls dependentCalls').forEach((key) => {
    equal(object[key].length, 2, `non-cached property ${key} should be called 2x`);
  });

  w('computedCachedCalls dependentCachedCalls').forEach((key) => {
    equal(object[key].length, 1, `non-cached property ${key} should be called 1x`);
  });
});

QUnit.test('setting values should call function return value', function() {
  // get each property twice. Verify return.
  var keys = w('computed dependent dependentFront computedCached dependentCached');
  var values = w('value1 value2');

  keys.forEach((key) => {
    equal(object.set(key, values[0]), values[0], `Try #1: object.set(${key}, ${values[0]}) should run function`);

    equal(object.set(key, values[1]), values[1], `Try #2: object.set(${key}, ${values[1]}) should run function`);

    equal(object.set(key, values[1]), values[1], `Try #3: object.set(${key}, ${values[1]}) should not run function since it is setting same value as before`);
  });

  // verify each call count.  cached should only be called once
  keys.forEach((key) => {
    var calls = object[key + 'Calls'];
    var idx, expectedLength;

    // Cached properties first check their cached value before setting the
    // property. Other properties blindly call set.
    expectedLength = 3;
    equal(calls.length, expectedLength, `set(${key}) should be called the right amount of times`);
    for (idx = 0; idx < 2; idx++) {
      equal(calls[idx], values[idx], `call #${idx + 1} to set(${key}) should have passed value ${values[idx]}`);
    }
  });
});

QUnit.test('notify change should clear cache', function() {
  // call get several times to collect call count
  object.get('computedCached'); // should run func
  object.get('computedCached'); // should not run func

  object.propertyWillChange('computedCached')
    .propertyDidChange('computedCached');

  object.get('computedCached'); // should run again
  equal(object.computedCachedCalls.length, 2, 'should have invoked method 2x');
});

QUnit.test('change dependent should clear cache', function() {
  // call get several times to collect call count
  var ret1 = object.get('inc'); // should run func
  equal(object.get('inc'), ret1, 'multiple calls should not run cached prop');

  object.set('changer', 'bar');

  equal(object.get('inc'), ret1 + 1, 'should increment after dependent key changes'); // should run again
});

QUnit.test('just notifying change of dependent should clear cache', function() {
  // call get several times to collect call count
  var ret1 = object.get('inc'); // should run func
  equal(object.get('inc'), ret1, 'multiple calls should not run cached prop');

  object.notifyPropertyChange('changer');

  equal(object.get('inc'), ret1 + 1, 'should increment after dependent key changes'); // should run again
});

QUnit.test('changing dependent should clear nested cache', function() {
  // call get several times to collect call count
  var ret1 = object.get('nestedInc'); // should run func
  equal(object.get('nestedInc'), ret1, 'multiple calls should not run cached prop');

  object.set('changer', 'bar');

  equal(object.get('nestedInc'), ret1 + 1, 'should increment after dependent key changes'); // should run again
});

QUnit.test('just notifying change of dependent should clear nested cache', function() {
  // call get several times to collect call count
  var ret1 = object.get('nestedInc'); // should run func
  equal(object.get('nestedInc'), ret1, 'multiple calls should not run cached prop');

  object.notifyPropertyChange('changer');

  equal(object.get('nestedInc'), ret1 + 1, 'should increment after dependent key changes'); // should run again
});


// This verifies a specific bug encountered where observers for computed
// properties would fire before their prop caches were cleared.
QUnit.test('change dependent should clear cache when observers of dependent are called', function() {
  // call get several times to collect call count
  var ret1 = object.get('inc'); // should run func
  equal(object.get('inc'), ret1, 'multiple calls should not run cached prop');

  // add observer to verify change...
  object.addObserver('inc', this, function() {
    equal(object.get('inc'), ret1 + 1, 'should increment after dependent key changes'); // should run again
  });

  // now run
  object.set('changer', 'bar');
});

QUnit.test('setting one of two computed properties that depend on a third property should clear the kvo cache', function() {
  // we have to call set twice to fill up the cache
  object.set('isOff', true);
  object.set('isOn', true);

  // setting isOff to true should clear the kvo cache
  object.set('isOff', true);
  equal(object.get('isOff'), true, 'object.isOff should be true');
  equal(object.get('isOn'), false, 'object.isOn should be false');
});

QUnit.test('dependent keys should be able to be specified as property paths', function() {
  var depObj = ObservableObject.extend({
    menuPrice: computed(function() {
      return this.get('menu.price');
    }).property('menu.price')
  }).create({
    menu: ObservableObject.create({
      price: 5
    })
  });

  equal(depObj.get('menuPrice'), 5, 'precond - initial value returns 5');

  depObj.set('menu.price', 6);

  equal(depObj.get('menuPrice'), 6, 'cache is properly invalidated after nested property changes');
});

QUnit.test('nested dependent keys should propagate after they update', function() {
  var bindObj;
  run(function () {
    lookup.DepObj = ObservableObject.extend({
      price: computed(function() {
        return this.get('restaurant.menu.price');
      }).property('restaurant.menu.price')
    }).create({
      restaurant: ObservableObject.create({
        menu: ObservableObject.create({
          price: 5
        })
      })
    });

    expectDeprecation(() => {
      bindObj = ObservableObject.extend({
        priceBinding: 'DepObj.price'
      }).create();
    }, /`Ember.Binding` is deprecated/);
  });

  equal(bindObj.get('price'), 5, 'precond - binding propagates');

  run(function () {
    lookup.DepObj.set('restaurant.menu.price', 10);
  });

  equal(bindObj.get('price'), 10, 'binding propagates after a nested dependent keys updates');

  run(function () {
    lookup.DepObj.set('restaurant.menu', ObservableObject.create({
      price: 15
    }));
  });

  equal(bindObj.get('price'), 15, 'binding propagates after a middle dependent keys updates');
});

QUnit.test('cacheable nested dependent keys should clear after their dependencies update', function() {
  ok(true);

  var DepObj;

  run(function() {
    lookup.DepObj = DepObj = ObservableObject.extend({
      price: computed('restaurant.menu.price', function() {
        return this.get('restaurant.menu.price');
      })
    }).create({
      restaurant: ObservableObject.create({
        menu: ObservableObject.create({
          price: 5
        })
      })
    });
  });

  equal(DepObj.get('price'), 5, 'precond - computed property is correct');

  run(function() {
    DepObj.set('restaurant.menu.price', 10);
  });
  equal(DepObj.get('price'), 10, 'cacheable computed properties are invalidated even if no run loop occurred');

  run(function() {
    DepObj.set('restaurant.menu.price', 20);
  });
  equal(DepObj.get('price'), 20, 'cacheable computed properties are invalidated after a second get before a run loop');
  equal(DepObj.get('price'), 20, 'precond - computed properties remain correct after a run loop');

  run(function() {
    DepObj.set('restaurant.menu', ObservableObject.create({
      price: 15
    }));
  });


  equal(DepObj.get('price'), 15, 'cacheable computed properties are invalidated after a middle property changes');

  run(function() {
    DepObj.set('restaurant.menu', ObservableObject.create({
      price: 25
    }));
  });

  equal(DepObj.get('price'), 25, 'cacheable computed properties are invalidated after a middle property changes again, before a run loop');
});



// ..........................................................
// OBSERVABLE OBJECTS
//

QUnit.module('Observable objects & object properties ', {
  setup() {
    object = ObservableObject.extend({
      getEach() {
        var keys = ['normal', 'abnormal'];
        var ret = [];
        for (var idx = 0; idx < keys.length; idx++) {
          ret[ret.length] = this.get(keys[idx]);
        }
        return ret;
      },

      newObserver() {
        this.abnormal = 'changedValueObserved';
      },

      testObserver: observer('normal', function() {
        this.abnormal = 'removedObserver';
      }),

      testArrayObserver: observer('normalArray.[]', function() {
        this.abnormal = 'notifiedObserver';
      })
    }).create({
      normal: 'value',
      abnormal: 'zeroValue',
      numberVal: 24,
      toggleVal: true,
      observedProperty: 'beingWatched',
      testRemove: 'observerToBeRemoved',
      normalArray: emberA([1, 2, 3, 4, 5])
    });
  }
});

QUnit.test('incrementProperty and decrementProperty', function() {
  var newValue = object.incrementProperty('numberVal');

  equal(25, newValue, 'numerical value incremented');
  object.numberVal = 24;
  newValue = object.decrementProperty('numberVal');
  equal(23, newValue, 'numerical value decremented');
  object.numberVal = 25;
  newValue = object.incrementProperty('numberVal', 5);
  equal(30, newValue, 'numerical value incremented by specified increment');
  object.numberVal = 25;
  newValue = object.incrementProperty('numberVal', -5);
  equal(20, newValue, 'minus numerical value incremented by specified increment');
  object.numberVal = 25;
  newValue = object.incrementProperty('numberVal', 0);
  equal(25, newValue, 'zero numerical value incremented by specified increment');

  expectAssertion(function() {
    newValue = object.incrementProperty('numberVal', (0 - void(0))); // Increment by NaN
  }, /Must pass a numeric value to incrementProperty/i);

  expectAssertion(function() {
    newValue = object.incrementProperty('numberVal', 'Ember'); // Increment by non-numeric String
  }, /Must pass a numeric value to incrementProperty/i);

  expectAssertion(function() {
    newValue = object.incrementProperty('numberVal', 1 / 0); // Increment by Infinity
  }, /Must pass a numeric value to incrementProperty/i);

  equal(25, newValue, 'Attempting to increment by non-numeric values should not increment value');

  object.numberVal = 25;
  newValue = object.decrementProperty('numberVal', 5);
  equal(20, newValue, 'numerical value decremented by specified increment');
  object.numberVal = 25;
  newValue = object.decrementProperty('numberVal', -5);
  equal(30, newValue, 'minus numerical value decremented by specified increment');
  object.numberVal = 25;
  newValue = object.decrementProperty('numberVal', 0);
  equal(25, newValue, 'zero numerical value decremented by specified increment');

  expectAssertion(function() {
    newValue = object.decrementProperty('numberVal', (0 - void(0))); // Decrement by NaN
  }, /Must pass a numeric value to decrementProperty/i);

  expectAssertion(function() {
    newValue = object.decrementProperty('numberVal', 'Ember'); // Decrement by non-numeric String
  }, /Must pass a numeric value to decrementProperty/i);

  expectAssertion(function() {
    newValue = object.decrementProperty('numberVal', 1 / 0); // Decrement by Infinity
  }, /Must pass a numeric value to decrementProperty/i);

  equal(25, newValue, 'Attempting to decrement by non-numeric values should not decrement value');
});

QUnit.test('toggle function, should be boolean', function() {
  equal(object.toggleProperty('toggleVal', true, false), object.get('toggleVal'));
  equal(object.toggleProperty('toggleVal', true, false), object.get('toggleVal'));
  equal(object.toggleProperty('toggleVal', undefined, undefined), object.get('toggleVal'));
});

QUnit.test('should notify array observer when array changes', function() {
  get(object, 'normalArray').replace(0, 0, [6]);
  equal(object.abnormal, 'notifiedObserver', 'observer should be notified');
});

QUnit.module('object.addObserver()', {
  setup() {
    ObjectC = ObservableObject.create({
      objectE: ObservableObject.create({
        propertyVal: 'chainedProperty'
      }),

      normal: 'value',
      normal1: 'zeroValue',
      normal2: 'dependentValue',
      incrementor: 10,

      action() {
        this.normal1 = 'newZeroValue';
      },

      observeOnceAction() {
        this.incrementor = this.incrementor + 1;
      },

      chainedObserver() {
        this.normal2 = 'chainedPropertyObserved';
      }
    });
  }
});

QUnit.test('should register an observer for a property', function() {
  ObjectC.addObserver('normal', ObjectC, 'action');
  ObjectC.set('normal', 'newValue');
  equal(ObjectC.normal1, 'newZeroValue');
});

QUnit.test('should register an observer for a property - Special case of chained property', function() {
  ObjectC.addObserver('objectE.propertyVal', ObjectC, 'chainedObserver');
  ObjectC.objectE.set('propertyVal', 'chainedPropertyValue');
  equal('chainedPropertyObserved', ObjectC.normal2);
  ObjectC.normal2 = 'dependentValue';
  ObjectC.set('objectE', '');
  equal('chainedPropertyObserved', ObjectC.normal2);
});

QUnit.module('object.removeObserver()', {
  setup() {
    ObjectD = ObservableObject.create({
      objectF: ObservableObject.create({
        propertyVal: 'chainedProperty'
      }),

      normal: 'value',
      normal1: 'zeroValue',
      normal2: 'dependentValue',
      ArrayKeys: ['normal', 'normal1'],

      addAction() {
        this.normal1 = 'newZeroValue';
      },
      removeAction() {
        this.normal2 = 'newDependentValue';
      },
      removeChainedObserver() {
        this.normal2 = 'chainedPropertyObserved';
      },

      observableValue: 'hello world',

      observer1() {
        // Just an observer
      },
      observer2() {
        this.removeObserver('observableValue', null, 'observer1');
        this.removeObserver('observableValue', null, 'observer2');
        this.hasObserverFor('observableValue');   // Tickle 'getMembers()'
        this.removeObserver('observableValue', null, 'observer3');
      },
      observer3() {
        // Just an observer
      }
    });
  }
});

QUnit.test('should unregister an observer for a property', function() {
  ObjectD.addObserver('normal', ObjectD, 'addAction');
  ObjectD.set('normal', 'newValue');
  equal(ObjectD.normal1, 'newZeroValue');

  ObjectD.set('normal1', 'zeroValue');

  ObjectD.removeObserver('normal', ObjectD, 'addAction');
  ObjectD.set('normal', 'newValue');
  equal(ObjectD.normal1, 'zeroValue');
});


QUnit.test('should unregister an observer for a property - special case when key has a \'.\' in it.', function() {
  ObjectD.addObserver('objectF.propertyVal', ObjectD, 'removeChainedObserver');
  ObjectD.objectF.set('propertyVal', 'chainedPropertyValue');
  ObjectD.removeObserver('objectF.propertyVal', ObjectD, 'removeChainedObserver');
  ObjectD.normal2 = 'dependentValue';
  ObjectD.objectF.set('propertyVal', 'removedPropertyValue');
  equal('dependentValue', ObjectD.normal2);
  ObjectD.set('objectF', '');
  equal('dependentValue', ObjectD.normal2);
});


QUnit.test('removing an observer inside of an observer shouldn’t cause any problems', function() {
  // The observable system should be protected against clients removing
  // observers in the middle of observer notification.
  var encounteredError = false;
  try {
    ObjectD.addObserver('observableValue', null, 'observer1');
    ObjectD.addObserver('observableValue', null, 'observer2');
    ObjectD.addObserver('observableValue', null, 'observer3');
    run(function() {
      ObjectD.set('observableValue', 'hi world');
    });
  } catch (e) {
    encounteredError = true;
  }
  equal(encounteredError, false);
});



QUnit.module('Bind function', {
  setup() {
    objectA = ObservableObject.create({
      name: 'Sproutcore',
      location: 'Timbaktu'
    });

    objectB = ObservableObject.create({
      normal: 'value',
      computed() {
        this.normal = 'newValue';
      }
    });

    lookup = context.lookup = {
      'Namespace': {
        objectA: objectA,
        objectB: objectB
      }
    };
  },

  teardown() {
    context.lookup = originalLookup;
  }
});

QUnit.test('should bind property with method parameter as undefined', function() {
  // creating binding
  run(function() {
    expectDeprecation(() => {
      objectA.bind('name', 'Namespace.objectB.normal', undefined);
    }, /`Ember.Binding` is deprecated/);
  });

  // now make a change to see if the binding triggers.
  run(function() {
    objectB.set('normal', 'changedValue');
  });

  // support new-style bindings if available
  equal('changedValue', objectA.get('name'), 'objectA.name is bound');
});

// ..........................................................
// SPECIAL CASES
//

QUnit.test('changing chained observer object to null should not raise exception', function() {
  var obj = ObservableObject.create({
    foo: ObservableObject.create({
      bar: ObservableObject.create({ bat: 'BAT' })
    })
  });

  var callCount = 0;
  obj.foo.addObserver('bar.bat', obj, function(target, key, value) {
    callCount++;
  });

  run(function() {
    obj.foo.set('bar', null);
  });

  equal(callCount, 1, 'changing bar should trigger observer');
  expect(1);
});
