import { get } from 'ember-metal/property_get';
import { forEach } from 'ember-metal/enumerable_utils';
import { computed } from 'ember-metal/computed';
import run from 'ember-metal/run_loop';
import { typeOf } from 'ember-metal/utils';
import { observer } from 'ember-metal/mixin';
import {
  fmt,
  w
} from "ember-runtime/system/string";
import EmberObject from 'ember-runtime/system/object';
import Observable from 'ember-runtime/mixins/observable';

/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.

  CHANGES FROM 1.6:

  * Added ObservableObject which applies the Ember.Observable mixin.
  * Changed reference to Ember.T_FUNCTION to 'function'
  * Changed all references to sc_super to this._super.apply(this, arguments)
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
var originalLookup = Ember.lookup;

// ..........................................................
// GET()
//

QUnit.module("object.get()", {

  setup() {
    object = ObservableObject.createWithMixins(Observable, {

      normal: 'value',
      numberVal: 24,
      toggleVal: true,

      computed: computed(function() { return 'value'; }).volatile(),

      method() { return "value"; },

      nullProperty: null,

      unknownProperty(key, value) {
        this.lastUnknownProperty = key;
        return "unknown";
      }

    });
  }

});

QUnit.test("should get normal properties", function() {
  equal(object.get('normal'), 'value');
});

QUnit.test("should call computed properties and return their result", function() {
  equal(object.get("computed"), "value");
});

QUnit.test("should return the function for a non-computed property", function() {
  var value = object.get("method");
  equal(typeOf(value), 'function');
});

QUnit.test("should return null when property value is null", function() {
  equal(object.get("nullProperty"), null);
});

QUnit.test("should call unknownProperty when value is undefined", function() {
  equal(object.get("unknown"), "unknown");
  equal(object.lastUnknownProperty, "unknown");
});

// ..........................................................
// Ember.GET()
//
QUnit.module("Ember.get()", {
  setup() {
    objectA = ObservableObject.createWithMixins({

      normal: 'value',
      numberVal: 24,
      toggleVal: true,

      computed: computed(function() { return 'value'; }).volatile(),

      method() { return "value"; },

      nullProperty: null,

      unknownProperty(key, value) {
        this.lastUnknownProperty = key;
        return "unknown";
      }

    });

    objectB = {
      normal: 'value',

      nullProperty: null
    };
  }
});

QUnit.test("should get normal properties on Ember.Observable", function() {
  equal(get(objectA, 'normal'), 'value');
});

QUnit.test("should call computed properties on Ember.Observable and return their result", function() {
  equal(get(objectA, "computed"), "value");
});

QUnit.test("should return the function for a non-computed property on Ember.Observable", function() {
  var value = get(objectA, "method");
  equal(typeOf(value), 'function');
});

QUnit.test("should return null when property value is null on Ember.Observable", function() {
  equal(get(objectA, "nullProperty"), null);
});

QUnit.test("should call unknownProperty when value is undefined on Ember.Observable", function() {
  equal(get(object, "unknown"), "unknown");
  equal(object.lastUnknownProperty, "unknown");
});

QUnit.test("should get normal properties on standard objects", function() {
  equal(get(objectB, 'normal'), 'value');
});

QUnit.test("should return null when property is null on standard objects", function() {
  equal(get(objectB, 'nullProperty'), null);
});

/*
QUnit.test("raise if the provided object is null", function() {
  throws(function() {
    get(null, 'key');
  });
});
*/

QUnit.test("raise if the provided object is undefined", function() {
  expectAssertion(function() {
    get(undefined, 'key');
  }, /Cannot call get with 'key' on an undefined object/i);
});

QUnit.test("should work when object is Ember (used in Ember.get)", function() {
  equal(get('Ember.RunLoop'), Ember.RunLoop, 'Ember.get');
  equal(get(Ember, 'RunLoop'), Ember.RunLoop, 'Ember.get(Ember, RunLoop)');
});

QUnit.module("Ember.get() with paths", {
  setup() {
    lookup = Ember.lookup = {};
  },

  teardown() {
    Ember.lookup = originalLookup;
  }
});

QUnit.test("should return a property at a given path relative to the lookup", function() {
  lookup.Foo = ObservableObject.create({
    Bar: ObservableObject.createWithMixins({
      Baz: computed(function() { return "blargh"; }).volatile()
    })
  });

  equal(get('Foo.Bar.Baz'), "blargh");
});

QUnit.test("should return a property at a given path relative to the passed object", function() {
  var foo = ObservableObject.create({
    bar: ObservableObject.createWithMixins({
      baz: computed(function() { return "blargh"; }).volatile()
    })
  });

  equal(get(foo, 'bar.baz'), "blargh");
});

QUnit.test("should return a property at a given path relative to the lookup - JavaScript hash", function() {
  lookup.Foo = {
    Bar: {
      Baz: "blargh"
    }
  };

  equal(get('Foo.Bar.Baz'), "blargh");
});

QUnit.test("should return a property at a given path relative to the passed object - JavaScript hash", function() {
  var foo = {
    bar: {
      baz: "blargh"
    }
  };

  equal(get(foo, 'bar.baz'), "blargh");
});

// ..........................................................
// SET()
//

QUnit.module("object.set()", {

  setup() {
    object = ObservableObject.createWithMixins({

      // normal property
      normal: 'value',

      // computed property
      _computed: "computed",
      computed: computed({
        get: function(key) {
          return this._computed;
        },
        set: function(key, value) {
          this._computed = value;
          return this._computed;
        }
      }).volatile(),

      // method, but not a property
      _method: "method",
      method(key, value) {
        if (value !== undefined) {
          this._method = value;
        }
        return this._method;
      },

      // null property
      nullProperty: null,

      // unknown property
      _unknown: 'unknown',
      unknownProperty(key) {
        return this._unknown;
      },

      setUnknownProperty(key, value) {
        this._unknown = value;
        return this._unknown;
      }
    });
  }

});

QUnit.test("should change normal properties and return this", function() {
  var ret = object.set("normal", "changed");
  equal(object.normal, "changed");
  equal(ret, object);
});

QUnit.test("should call computed properties passing value and return this", function() {
  var ret = object.set("computed", "changed");
  equal(object._computed, "changed");
  equal(ret, object);
});

QUnit.test("should change normal properties when passing undefined", function() {
  var ret = object.set('normal', undefined);
  equal(object.normal, undefined);
  equal(ret, object);
});

QUnit.test("should replace the function for a non-computed property and return this", function() {
  var ret = object.set("method", "changed");
  equal(object._method, "method"); // make sure this was NOT run
  ok(typeOf(object.method) !== 'function');
  equal(ret, object);
});

QUnit.test("should replace prover when property value is null", function() {
  var ret = object.set("nullProperty", "changed");
  equal(object.nullProperty, "changed");
  equal(ret, object);
});

QUnit.test("should call unknownProperty with value when property is undefined", function() {
  var ret = object.set("unknown", "changed");
  equal(object._unknown, "changed");
  equal(ret, object);
});

// ..........................................................
// COMPUTED PROPERTIES
//

QUnit.module("Computed properties", {
  setup() {
    lookup = Ember.lookup = {};

    object = ObservableObject.createWithMixins({

      // REGULAR

      computedCalls: [],
      computed: computed({
        get: function() {
          this.computedCalls.push('getter-called');
          return 'computed';
        },
        set: function(key, value) {
          this.computedCalls.push(value);
        }
      }).volatile(),

      computedCachedCalls: [],
      computedCached: computed({
        get: function() {
          this.computedCachedCalls.push('getter-called');
          return 'computedCached';
        },
        set: function(key, value) {
          this.computedCachedCalls.push(value);
        }
      }),

      // DEPENDENT KEYS

      changer: 'foo',

      dependentCalls: [],
      dependent: computed({
        get: function() {
          this.dependentCalls.push('getter-called');
          return 'dependent';
        },
        set: function(key, value) {
          this.dependentCalls.push(value);
        }
      }).property('changer').volatile(),

      dependentFrontCalls: [],
      dependentFront: computed('changer', {
        get: function() {
          this.dependentFrontCalls.push('getter-called');
          return 'dependentFront';
        },
        set: function(key, value) {
          this.dependentFrontCalls.push(value);
        }
      }).volatile(),

      dependentCachedCalls: [],
      dependentCached: computed({
        get: function() {
          this.dependentCachedCalls.push('getter-called!');
          return 'dependentCached';
        },
        set: function(key, value) {
          this.dependentCachedCalls.push(value);
        }
      }).property('changer'),

      // every time it is recomputed, increments call
      incCallCount: 0,
      inc: computed(function() {
        return this.incCallCount++;
      }).property('changer'),

      // depends on cached property which depends on another property...
      nestedIncCallCount: 0,
      nestedInc: computed(function(key) {
        get(this, 'inc');
        return this.nestedIncCallCount++;
      }).property('inc'),

      // two computed properties that depend on a third property
      state: 'on',
      isOn: computed({
        get: function() {
          return this.get('state') === 'on';
        },
        set: function(key, value) {
          this.set('state', 'on');
          return this.get('state') === 'on';
        }
      }).property('state').volatile(),

      isOff: computed({
        get: function() {
          return this.get('state') === 'off';
        },
        set: function(key, value) {
          this.set('state', 'off');
          return this.get('state') === 'off';
        }
      }).property('state').volatile()

    });
  },
  teardown() {
    Ember.lookup = originalLookup;
  }
});

QUnit.test("getting values should call function return value", function() {

  // get each property twice. Verify return.
  var keys = w('computed computedCached dependent dependentFront dependentCached');

  forEach(keys, function(key) {
    equal(object.get(key), key, fmt('Try #1: object.get(%@) should run function', [key]));
    equal(object.get(key), key, fmt('Try #2: object.get(%@) should run function', [key]));
  });

  // verify each call count.  cached should only be called once
  forEach(w('computedCalls dependentFrontCalls dependentCalls'), function(key) {
    equal(object[key].length, 2, fmt('non-cached property %@ should be called 2x', [key]));
  });

  forEach(w('computedCachedCalls dependentCachedCalls'), function(key) {
    equal(object[key].length, 1, fmt('non-cached property %@ should be called 1x', [key]));
  });

});

QUnit.test("setting values should call function return value", function() {

  // get each property twice. Verify return.
  var keys = w('computed dependent dependentFront computedCached dependentCached');
  var values = w('value1 value2');

  forEach(keys, function(key) {

    equal(object.set(key, values[0]), object, fmt('Try #1: object.set(%@, %@) should run function', [key, values[0]]));

    equal(object.set(key, values[1]), object, fmt('Try #2: object.set(%@, %@) should run function', [key, values[1]]));

    equal(object.set(key, values[1]), object, fmt('Try #3: object.set(%@, %@) should not run function since it is setting same value as before', [key, values[1]]));

  });


  // verify each call count.  cached should only be called once
  forEach(keys, function(key) {
    var calls = object[key + 'Calls'];
    var idx, expectedLength;

    // Cached properties first check their cached value before setting the
    // property. Other properties blindly call set.
    expectedLength = 3;
    equal(calls.length, expectedLength, fmt('set(%@) should be called the right amount of times', [key]));
    for (idx=0;idx<2;idx++) {
      equal(calls[idx], values[idx], fmt('call #%@ to set(%@) should have passed value %@', [idx+1, key, values[idx]]));
    }
  });

});

QUnit.test("notify change should clear cache", function() {

  // call get several times to collect call count
  object.get('computedCached'); // should run func
  object.get('computedCached'); // should not run func

  object.propertyWillChange('computedCached')
    .propertyDidChange('computedCached');

  object.get('computedCached'); // should run again
  equal(object.computedCachedCalls.length, 2, 'should have invoked method 2x');
});

QUnit.test("change dependent should clear cache", function() {

  // call get several times to collect call count
  var ret1 = object.get('inc'); // should run func
  equal(object.get('inc'), ret1, 'multiple calls should not run cached prop');

  object.set('changer', 'bar');

  equal(object.get('inc'), ret1+1, 'should increment after dependent key changes'); // should run again
});

QUnit.test("just notifying change of dependent should clear cache", function() {

  // call get several times to collect call count
  var ret1 = object.get('inc'); // should run func
  equal(object.get('inc'), ret1, 'multiple calls should not run cached prop');

  object.notifyPropertyChange('changer');

  equal(object.get('inc'), ret1+1, 'should increment after dependent key changes'); // should run again
});

QUnit.test("changing dependent should clear nested cache", function() {

  // call get several times to collect call count
  var ret1 = object.get('nestedInc'); // should run func
  equal(object.get('nestedInc'), ret1, 'multiple calls should not run cached prop');

  object.set('changer', 'bar');

  equal(object.get('nestedInc'), ret1+1, 'should increment after dependent key changes'); // should run again

});

QUnit.test("just notifying change of dependent should clear nested cache", function() {

  // call get several times to collect call count
  var ret1 = object.get('nestedInc'); // should run func
  equal(object.get('nestedInc'), ret1, 'multiple calls should not run cached prop');

  object.notifyPropertyChange('changer');

  equal(object.get('nestedInc'), ret1+1, 'should increment after dependent key changes'); // should run again

});


// This verifies a specific bug encountered where observers for computed
// properties would fire before their prop caches were cleared.
QUnit.test("change dependent should clear cache when observers of dependent are called", function() {

  // call get several times to collect call count
  var ret1 = object.get('inc'); // should run func
  equal(object.get('inc'), ret1, 'multiple calls should not run cached prop');

  // add observer to verify change...
  object.addObserver('inc', this, function() {
    equal(object.get('inc'), ret1+1, 'should increment after dependent key changes'); // should run again
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

QUnit.test("dependent keys should be able to be specified as property paths", function() {
  var depObj = ObservableObject.createWithMixins({
    menu: ObservableObject.create({
      price: 5
    }),

    menuPrice: computed(function() {
      return this.get('menu.price');
    }).property('menu.price')
  });

  equal(depObj.get('menuPrice'), 5, "precond - initial value returns 5");

  depObj.set('menu.price', 6);

  equal(depObj.get('menuPrice'), 6, "cache is properly invalidated after nested property changes");
});

QUnit.test("nested dependent keys should propagate after they update", function() {
  var bindObj;
  run(function () {
    lookup.DepObj = ObservableObject.createWithMixins({
      restaurant: ObservableObject.create({
        menu: ObservableObject.create({
          price: 5
        })
      }),

      price: computed(function() {
        return this.get('restaurant.menu.price');
      }).property('restaurant.menu.price')
    });

    bindObj = ObservableObject.createWithMixins({
      priceBinding: "DepObj.price"
    });
  });

  equal(bindObj.get('price'), 5, "precond - binding propagates");

  run(function () {
    lookup.DepObj.set('restaurant.menu.price', 10);
  });

  equal(bindObj.get('price'), 10, "binding propagates after a nested dependent keys updates");

  run(function () {
    lookup.DepObj.set('restaurant.menu', ObservableObject.create({
      price: 15
    }));
  });

  equal(bindObj.get('price'), 15, "binding propagates after a middle dependent keys updates");
});

QUnit.test("cacheable nested dependent keys should clear after their dependencies update", function() {
  ok(true);

  var DepObj;

  run(function() {
    lookup.DepObj = DepObj = ObservableObject.createWithMixins({
      restaurant: ObservableObject.create({
        menu: ObservableObject.create({
          price: 5
        })
      }),

      price: computed(function() {
        return this.get('restaurant.menu.price');
      }).property('restaurant.menu.price')
    });
  });

  equal(DepObj.get('price'), 5, "precond - computed property is correct");

  run(function() {
    DepObj.set('restaurant.menu.price', 10);
  });
  equal(DepObj.get('price'), 10, "cacheable computed properties are invalidated even if no run loop occurred");

  run(function() {
    DepObj.set('restaurant.menu.price', 20);
  });
  equal(DepObj.get('price'), 20, "cacheable computed properties are invalidated after a second get before a run loop");
  equal(DepObj.get('price'), 20, "precond - computed properties remain correct after a run loop");

  run(function() {
    DepObj.set('restaurant.menu', ObservableObject.create({
      price: 15
    }));
  });


  equal(DepObj.get('price'), 15, "cacheable computed properties are invalidated after a middle property changes");

  run(function() {
    DepObj.set('restaurant.menu', ObservableObject.create({
      price: 25
    }));
  });

  equal(DepObj.get('price'), 25, "cacheable computed properties are invalidated after a middle property changes again, before a run loop");
});



// ..........................................................
// OBSERVABLE OBJECTS
//

QUnit.module("Observable objects & object properties ", {

  setup() {
    object = ObservableObject.createWithMixins({

      normal: 'value',
      abnormal: 'zeroValue',
      numberVal: 24,
      toggleVal: true,
      observedProperty: 'beingWatched',
      testRemove: 'observerToBeRemoved',
      normalArray: Ember.A([1,2,3,4,5]),

      getEach() {
        var keys = ['normal','abnormal'];
        var ret = [];
        for (var idx=0; idx<keys.length;idx++) {
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
    newValue = object.incrementProperty('numberVal', 1/0); // Increment by Infinity
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
    newValue = object.decrementProperty('numberVal', 1/0); // Decrement by Infinity
  }, /Must pass a numeric value to decrementProperty/i);

  equal(25, newValue, 'Attempting to decrement by non-numeric values should not decrement value');
});

QUnit.test('toggle function, should be boolean', function() {
  equal(object.toggleProperty('toggleVal', true, false), object.get('toggleVal'));
  equal(object.toggleProperty('toggleVal', true, false), object.get('toggleVal'));
  equal(object.toggleProperty('toggleVal', undefined, undefined), object.get('toggleVal'));
});

QUnit.test('should notify array observer when array changes', function() {
  get(object, 'normalArray').replace(0, 0, 6);
  equal(object.abnormal, 'notifiedObserver', 'observer should be notified');
});

QUnit.module("object.addObserver()", {
  setup() {

    ObjectC = ObservableObject.create({

      objectE: ObservableObject.create({
        propertyVal: "chainedProperty"
      }),

      normal: 'value',
      normal1: 'zeroValue',
      normal2: 'dependentValue',
      incrementor: 10,

      action() {
        this.normal1= 'newZeroValue';
      },

      observeOnceAction() {
        this.incrementor= this.incrementor+1;
      },

      chainedObserver() {
        this.normal2 = 'chainedPropertyObserved';
      }

    });
  }
});

QUnit.test("should register an observer for a property", function() {
  ObjectC.addObserver('normal', ObjectC, 'action');
  ObjectC.set('normal', 'newValue');
  equal(ObjectC.normal1, 'newZeroValue');
});

QUnit.test("should register an observer for a property - Special case of chained property", function() {
  ObjectC.addObserver('objectE.propertyVal', ObjectC, 'chainedObserver');
  ObjectC.objectE.set('propertyVal', "chainedPropertyValue");
  equal('chainedPropertyObserved', ObjectC.normal2);
  ObjectC.normal2 = 'dependentValue';
  ObjectC.set('objectE', '');
  equal('chainedPropertyObserved', ObjectC.normal2);
});

QUnit.module("object.removeObserver()", {
  setup() {
    ObjectD = ObservableObject.create({

      objectF: ObservableObject.create({
        propertyVal: "chainedProperty"
      }),

      normal: 'value',
      normal1: 'zeroValue',
      normal2: 'dependentValue',
      ArrayKeys: ['normal','normal1'],

      addAction() {
        this.normal1 = 'newZeroValue';
      },
      removeAction() {
        this.normal2 = 'newDependentValue';
      },
      removeChainedObserver() {
        this.normal2 = 'chainedPropertyObserved';
      },

      observableValue: "hello world",

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

QUnit.test("should unregister an observer for a property", function() {
  ObjectD.addObserver('normal', ObjectD, 'addAction');
  ObjectD.set('normal', 'newValue');
  equal(ObjectD.normal1, 'newZeroValue');

  ObjectD.set('normal1', 'zeroValue');

  ObjectD.removeObserver('normal', ObjectD, 'addAction');
  ObjectD.set('normal', 'newValue');
  equal(ObjectD.normal1, 'zeroValue');
});


QUnit.test("should unregister an observer for a property - special case when key has a '.' in it.", function() {
  ObjectD.addObserver('objectF.propertyVal', ObjectD, 'removeChainedObserver');
  ObjectD.objectF.set('propertyVal', "chainedPropertyValue");
  ObjectD.removeObserver('objectF.propertyVal', ObjectD, 'removeChainedObserver');
  ObjectD.normal2 = 'dependentValue';
  ObjectD.objectF.set('propertyVal', "removedPropertyValue");
  equal('dependentValue', ObjectD.normal2);
  ObjectD.set('objectF', '');
  equal('dependentValue', ObjectD.normal2);
});


QUnit.test("removing an observer inside of an observer shouldn’t cause any problems", function() {
  // The observable system should be protected against clients removing
  // observers in the middle of observer notification.
  var encounteredError = false;
  try {
    ObjectD.addObserver('observableValue', null, 'observer1');
    ObjectD.addObserver('observableValue', null, 'observer2');
    ObjectD.addObserver('observableValue', null, 'observer3');
    run(function() {
      ObjectD.set('observableValue', "hi world");
    });
  }
  catch(e) {
    encounteredError = true;
  }
  equal(encounteredError, false);
});



QUnit.module("Bind function ", {

  setup() {
    originalLookup = Ember.lookup;
    objectA = ObservableObject.create({
      name: "Sproutcore",
      location: "Timbaktu"
    });

    objectB = ObservableObject.create({
      normal: "value",
      computed() {
        this.normal = 'newValue';
      }
    });

    lookup = Ember.lookup = {
      'Namespace': {
        objectA: objectA,
        objectB: objectB
      }
    };
  },

  teardown() {
    Ember.lookup = originalLookup;
  }
});

QUnit.test("should bind property with method parameter as undefined", function() {
  // creating binding
  run(function() {
    objectA.bind("name", "Namespace.objectB.normal", undefined);
  });

  // now make a change to see if the binding triggers.
  run(function() {
    objectB.set("normal", "changedValue");
  });

  // support new-style bindings if available
  equal("changedValue", objectA.get("name"), "objectA.name is bound");
});

// ..........................................................
// SPECIAL CASES
//

QUnit.test("changing chained observer object to null should not raise exception", function() {

  var obj = ObservableObject.create({
    foo: ObservableObject.create({
      bar: ObservableObject.create({ bat: "BAT" })
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
