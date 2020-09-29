import { context } from '@ember/-internals/environment';
import { run } from '@ember/runloop';
import { get, computed, observer } from '@ember/-internals/metal';
import { w } from '@ember/string';
import EmberObject from '../../../../lib/system/object';
import Observable from '../../../../lib/mixins/observable';
import { A as emberA } from '../../../../lib/mixins/array';
import { moduleFor, AbstractTestCase, runLoopSettled } from 'internal-test-helpers';

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
  * removed test in observer around line 862 that expected key/value to be
    the last item in the chained path.  Should be root and chained path

*/

// ========================================================================
// Ember.Observable Tests
// ========================================================================

let object, objectA, objectB, objectC, objectD, objectE, objectF, lookup;

const ObservableObject = EmberObject.extend(Observable);
const originalLookup = context.lookup;

class ObservableTestCase extends AbstractTestCase {
  afterEach() {
    let destroyables = [object, objectA, objectB, objectC, objectD, objectE, objectF].filter(
      (obj) => obj && obj.destroy
    );

    object = objectA = objectC = objectD = objectE = objectF = undefined;
    context.lookup = originalLookup;
    lookup = undefined;
    destroyables.forEach((obj) => obj.destroy());
    return runLoopSettled();
  }
}

// ..........................................................
// GET()
//

moduleFor(
  'object.get()',
  class extends ObservableTestCase {
    beforeEach() {
      object = ObservableObject.extend(Observable, {
        computed: computed(function () {
          return 'value';
        }),
        method() {
          return 'value';
        },
        unknownProperty(key) {
          this.lastUnknownProperty = key;
          return 'unknown';
        },
      }).create({
        normal: 'value',
        numberVal: 24,
        toggleVal: true,
        nullProperty: null,
      });
    }

    ['@test should get normal properties'](assert) {
      assert.equal(object.get('normal'), 'value');
    }

    ['@test should call computed properties and return their result'](assert) {
      assert.equal(object.get('computed'), 'value');
    }

    ['@test should return the function for a non-computed property'](assert) {
      let value = object.get('method');
      assert.equal(typeof value, 'function');
    }

    ['@test should return null when property value is null'](assert) {
      assert.equal(object.get('nullProperty'), null);
    }

    ['@test should call unknownProperty when value is undefined'](assert) {
      assert.equal(object.get('unknown'), 'unknown');
      assert.equal(object.lastUnknownProperty, 'unknown');
    }
  }
);
// ..........................................................
// Ember.GET()
//
moduleFor(
  'Ember.get()',
  class extends ObservableTestCase {
    beforeEach() {
      objectA = ObservableObject.extend({
        computed: computed(function () {
          return 'value';
        }),
        method() {
          return 'value';
        },
        unknownProperty(key) {
          this.lastUnknownProperty = key;
          return 'unknown';
        },
      }).create({
        normal: 'value',
        numberVal: 24,
        toggleVal: true,
        nullProperty: null,
      });

      objectB = {
        normal: 'value',
        nullProperty: null,
      };
    }

    ['@test should get normal properties on Ember.Observable'](assert) {
      assert.equal(get(objectA, 'normal'), 'value');
    }

    ['@test should call computed properties on Ember.Observable and return their result'](assert) {
      assert.equal(get(objectA, 'computed'), 'value');
    }

    ['@test should return the function for a non-computed property on Ember.Observable'](assert) {
      let value = get(objectA, 'method');
      assert.equal(typeof value, 'function');
    }

    ['@test should return null when property value is null on Ember.Observable'](assert) {
      assert.equal(get(objectA, 'nullProperty'), null);
    }

    ['@test should call unknownProperty when value is undefined on Ember.Observable'](assert) {
      assert.equal(get(objectA, 'unknown'), 'unknown');
      assert.equal(objectA.lastUnknownProperty, 'unknown');
    }

    ['@test should get normal properties on standard objects'](assert) {
      assert.equal(get(objectB, 'normal'), 'value');
    }

    ['@test should return null when property is null on standard objects'](assert) {
      assert.equal(get(objectB, 'nullProperty'), null);
    }

    ['@test raise if the provided object is undefined']() {
      expectAssertion(function () {
        get(undefined, 'key');
      }, /Cannot call get with 'key' on an undefined object/i);
    }
  }
);

moduleFor(
  'Ember.get() with paths',
  class extends ObservableTestCase {
    ['@test should return a property at a given path relative to the passed object'](assert) {
      let foo = ObservableObject.create({
        bar: ObservableObject.extend({
          baz: computed(function () {
            return 'blargh';
          }),
        }).create(),
      });

      assert.equal(get(foo, 'bar.baz'), 'blargh');
    }

    ['@test should return a property at a given path relative to the passed object - JavaScript hash'](
      assert
    ) {
      let foo = {
        bar: {
          baz: 'blargh',
        },
      };

      assert.equal(get(foo, 'bar.baz'), 'blargh');
    }
  }
);

// ..........................................................
// SET()
//

moduleFor(
  'object.set()',
  class extends ObservableTestCase {
    beforeEach() {
      object = ObservableObject.extend({
        computed: computed({
          get() {
            return this._computed;
          },
          set(key, value) {
            this._computed = value;
            return this._computed;
          },
        }),

        method(key, value) {
          if (value !== undefined) {
            this._method = value;
          }
          return this._method;
        },

        unknownProperty() {
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
        _unknown: 'unknown',
      }).create();
    }

    ['@test should change normal properties and return the value'](assert) {
      let ret = object.set('normal', 'changed');
      assert.equal(object.get('normal'), 'changed');
      assert.equal(ret, 'changed');
    }

    ['@test should call computed properties passing value and return the value'](assert) {
      let ret = object.set('computed', 'changed');
      assert.equal(object.get('_computed'), 'changed');
      assert.equal(ret, 'changed');
    }

    ['@test should change normal properties when passing undefined'](assert) {
      let ret = object.set('normal', undefined);
      assert.equal(object.get('normal'), undefined);
      assert.equal(ret, undefined);
    }

    ['@test should replace the function for a non-computed property and return the value'](assert) {
      let ret = object.set('method', 'changed');
      assert.equal(object.get('_method'), 'method'); // make sure this was NOT run
      assert.ok(typeof object.get('method') !== 'function');
      assert.equal(ret, 'changed');
    }

    ['@test should replace prover when property value is null'](assert) {
      let ret = object.set('nullProperty', 'changed');
      assert.equal(object.get('nullProperty'), 'changed');
      assert.equal(ret, 'changed');
    }

    ['@test should call unknownProperty with value when property is undefined'](assert) {
      let ret = object.set('unknown', 'changed');
      assert.equal(object.get('_unknown'), 'changed');
      assert.equal(ret, 'changed');
    }
  }
);

// ..........................................................
// COMPUTED PROPERTIES
//

moduleFor(
  'Computed properties',
  class extends ObservableTestCase {
    beforeEach() {
      lookup = context.lookup = {};

      expectDeprecation(() => {
        object = ObservableObject.extend({
          computed: computed({
            get() {
              this.computedCalls.push('getter-called');
              return 'computed';
            },
            set(key, value) {
              this.computedCalls.push(value);
            },
          }).volatile(),

          computedCached: computed({
            get() {
              this.computedCachedCalls.push('getter-called');
              return 'computedCached';
            },
            set: function (key, value) {
              this.computedCachedCalls.push(value);
            },
          }),

          dependent: computed('changer', {
            get() {
              this.dependentCalls.push('getter-called');
              return 'dependent';
            },
            set(key, value) {
              this.dependentCalls.push(value);
            },
          }).volatile(),
          dependentFront: computed('changer', {
            get() {
              this.dependentFrontCalls.push('getter-called');
              return 'dependentFront';
            },
            set(key, value) {
              this.dependentFrontCalls.push(value);
            },
          }).volatile(),
          dependentCached: computed('changer', {
            get() {
              this.dependentCachedCalls.push('getter-called!');
              return 'dependentCached';
            },
            set(key, value) {
              this.dependentCachedCalls.push(value);
            },
          }),

          inc: computed('changer', function () {
            return this.incCallCount++;
          }),

          nestedInc: computed('inc', function () {
            get(this, 'inc');
            return this.nestedIncCallCount++;
          }),

          isOn: computed('state', {
            get() {
              return this.get('state') === 'on';
            },
            set() {
              this.set('state', 'on');
              return this.get('state') === 'on';
            },
          }).volatile(),

          isOff: computed('state', {
            get() {
              return this.get('state') === 'off';
            },
            set() {
              this.set('state', 'off');
              return this.get('state') === 'off';
            },
          }).volatile(),
        }).create({
          computedCalls: [],
          computedCachedCalls: [],
          changer: 'foo',
          dependentCalls: [],
          dependentFrontCalls: [],
          dependentCachedCalls: [],
          incCallCount: 0,
          nestedIncCallCount: 0,
          state: 'on',
        });
      });
    }

    ['@test getting values should call function return value'](assert) {
      // get each property twice. Verify return.
      let keys = w('computed computedCached dependent dependentFront dependentCached');

      keys.forEach(function (key) {
        assert.equal(object.get(key), key, `Try #1: object.get(${key}) should run function`);
        assert.equal(object.get(key), key, `Try #2: object.get(${key}) should run function`);
      });

      // verify each call count.  cached should only be called once
      w('computedCalls dependentFrontCalls dependentCalls').forEach((key) => {
        assert.equal(object[key].length, 2, `non-cached property ${key} should be called 2x`);
      });

      w('computedCachedCalls dependentCachedCalls').forEach((key) => {
        assert.equal(object[key].length, 1, `non-cached property ${key} should be called 1x`);
      });
    }

    ['@test setting values should call function return value'](assert) {
      // get each property twice. Verify return.
      let keys = w('computed dependent dependentFront computedCached dependentCached');
      let values = w('value1 value2');

      keys.forEach((key) => {
        assert.equal(
          object.set(key, values[0]),
          values[0],
          `Try #1: object.set(${key}, ${values[0]}) should run function`
        );

        assert.equal(
          object.set(key, values[1]),
          values[1],
          `Try #2: object.set(${key}, ${values[1]}) should run function`
        );

        assert.equal(
          object.set(key, values[1]),
          values[1],
          `Try #3: object.set(${key}, ${values[1]}) should not run function since it is setting same value as before`
        );
      });

      // verify each call count.  cached should only be called once
      keys.forEach((key) => {
        let calls = object[key + 'Calls'];
        let idx, expectedLength;

        // Cached properties first check their cached value before setting the
        // property. Other properties blindly call set.
        expectedLength = 3;
        assert.equal(
          calls.length,
          expectedLength,
          `set(${key}) should be called the right amount of times`
        );
        for (idx = 0; idx < 2; idx++) {
          assert.equal(
            calls[idx],
            values[idx],
            `call #${idx + 1} to set(${key}) should have passed value ${values[idx]}`
          );
        }
      });
    }

    ['@test notify change should clear cache'](assert) {
      // call get several times to collect call count
      object.get('computedCached'); // should run func
      object.get('computedCached'); // should not run func

      object.notifyPropertyChange('computedCached');

      object.get('computedCached'); // should run again
      assert.equal(object.computedCachedCalls.length, 2, 'should have invoked method 2x');
    }

    ['@test change dependent should clear cache'](assert) {
      // call get several times to collect call count
      let ret1 = object.get('inc'); // should run func
      assert.equal(object.get('inc'), ret1, 'multiple calls should not run cached prop');

      object.set('changer', 'bar');

      assert.equal(object.get('inc'), ret1 + 1, 'should increment after dependent key changes'); // should run again
    }

    ['@test just notifying change of dependent should clear cache'](assert) {
      // call get several times to collect call count
      let ret1 = object.get('inc'); // should run func
      assert.equal(object.get('inc'), ret1, 'multiple calls should not run cached prop');

      object.notifyPropertyChange('changer');

      assert.equal(object.get('inc'), ret1 + 1, 'should increment after dependent key changes'); // should run again
    }

    ['@test changing dependent should clear nested cache'](assert) {
      // call get several times to collect call count
      let ret1 = object.get('nestedInc'); // should run func
      assert.equal(object.get('nestedInc'), ret1, 'multiple calls should not run cached prop');

      object.set('changer', 'bar');

      assert.equal(
        object.get('nestedInc'),
        ret1 + 1,
        'should increment after dependent key changes'
      ); // should run again
    }

    ['@test just notifying change of dependent should clear nested cache'](assert) {
      // call get several times to collect call count
      let ret1 = object.get('nestedInc'); // should run func
      assert.equal(object.get('nestedInc'), ret1, 'multiple calls should not run cached prop');

      object.notifyPropertyChange('changer');

      assert.equal(
        object.get('nestedInc'),
        ret1 + 1,
        'should increment after dependent key changes'
      ); // should run again
    }

    // This verifies a specific bug encountered where observers for computed
    // properties would fire before their prop caches were cleared.
    ['@test change dependent should clear cache when observers of dependent are called'](assert) {
      // call get several times to collect call count
      let ret1 = object.get('inc'); // should run func
      assert.equal(object.get('inc'), ret1, 'multiple calls should not run cached prop');

      // add observer to verify change...
      object.addObserver('inc', this, function () {
        assert.equal(object.get('inc'), ret1 + 1, 'should increment after dependent key changes'); // should run again
      });

      // now run
      object.set('changer', 'bar');
    }

    ['@test setting one of two computed properties that depend on a third property should clear the kvo cache'](
      assert
    ) {
      // we have to call set twice to fill up the cache
      object.set('isOff', true);
      object.set('isOn', true);

      // setting isOff to true should clear the kvo cache
      object.set('isOff', true);
      assert.equal(object.get('isOff'), true, 'object.isOff should be true');
      assert.equal(object.get('isOn'), false, 'object.isOn should be false');
    }

    ['@test dependent keys should be able to be specified as property paths'](assert) {
      let depObj = ObservableObject.extend({
        menuPrice: computed('menu.price', function () {
          return this.get('menu.price');
        }),
      }).create({
        menu: ObservableObject.create({
          price: 5,
        }),
      });

      assert.equal(depObj.get('menuPrice'), 5, 'precond - initial value returns 5');

      depObj.set('menu.price', 6);

      assert.equal(
        depObj.get('menuPrice'),
        6,
        'cache is properly invalidated after nested property changes'
      );
    }

    ['@test cacheable nested dependent keys should clear after their dependencies update'](assert) {
      assert.ok(true);

      let DepObj;

      run(function () {
        lookup.DepObj = DepObj = ObservableObject.extend({
          price: computed('restaurant.menu.price', function () {
            return this.get('restaurant.menu.price');
          }),
        }).create({
          restaurant: ObservableObject.create({
            menu: ObservableObject.create({
              price: 5,
            }),
          }),
        });
      });

      assert.equal(DepObj.get('price'), 5, 'precond - computed property is correct');

      run(function () {
        DepObj.set('restaurant.menu.price', 10);
      });
      assert.equal(
        DepObj.get('price'),
        10,
        'cacheable computed properties are invalidated even if no run loop occurred'
      );

      run(function () {
        DepObj.set('restaurant.menu.price', 20);
      });
      assert.equal(
        DepObj.get('price'),
        20,
        'cacheable computed properties are invalidated after a second get before a run loop'
      );
      assert.equal(
        DepObj.get('price'),
        20,
        'precond - computed properties remain correct after a run loop'
      );

      run(function () {
        DepObj.set(
          'restaurant.menu',
          ObservableObject.create({
            price: 15,
          })
        );
      });

      assert.equal(
        DepObj.get('price'),
        15,
        'cacheable computed properties are invalidated after a middle property changes'
      );

      run(function () {
        DepObj.set(
          'restaurant.menu',
          ObservableObject.create({
            price: 25,
          })
        );
      });

      assert.equal(
        DepObj.get('price'),
        25,
        'cacheable computed properties are invalidated after a middle property changes again, before a run loop'
      );
    }
  }
);

// ..........................................................
// OBSERVABLE OBJECTS
//

moduleFor(
  'Observable objects & object properties ',
  class extends ObservableTestCase {
    beforeEach() {
      object = ObservableObject.extend({
        getEach() {
          let keys = ['normal', 'abnormal'];
          let ret = [];
          for (let idx = 0; idx < keys.length; idx++) {
            ret[ret.length] = this.get(keys[idx]);
          }
          return ret;
        },

        newObserver() {
          this.abnormal = 'changedValueObserved';
        },

        testObserver: observer('normal', function () {
          this.abnormal = 'removedObserver';
        }),

        testArrayObserver: observer('normalArray.[]', function () {
          this.abnormal = 'notifiedObserver';
        }),
      }).create({
        normal: 'value',
        abnormal: 'zeroValue',
        numberVal: 24,
        toggleVal: true,
        observedProperty: 'beingWatched',
        testRemove: 'observerToBeRemoved',
        normalArray: emberA([1, 2, 3, 4, 5]),
      });
    }

    ['@test incrementProperty and decrementProperty'](assert) {
      let newValue = object.incrementProperty('numberVal');

      assert.equal(25, newValue, 'numerical value incremented');
      object.numberVal = 24;
      newValue = object.decrementProperty('numberVal');
      assert.equal(23, newValue, 'numerical value decremented');
      object.numberVal = 25;
      newValue = object.incrementProperty('numberVal', 5);
      assert.equal(30, newValue, 'numerical value incremented by specified increment');
      object.numberVal = 25;
      newValue = object.incrementProperty('numberVal', -5);
      assert.equal(20, newValue, 'minus numerical value incremented by specified increment');
      object.numberVal = 25;
      newValue = object.incrementProperty('numberVal', 0);
      assert.equal(25, newValue, 'zero numerical value incremented by specified increment');

      expectAssertion(function () {
        newValue = object.incrementProperty('numberVal', 0 - void 0); // Increment by NaN
      }, /Must pass a numeric value to incrementProperty/i);

      expectAssertion(function () {
        newValue = object.incrementProperty('numberVal', 'Ember'); // Increment by non-numeric String
      }, /Must pass a numeric value to incrementProperty/i);

      expectAssertion(function () {
        newValue = object.incrementProperty('numberVal', 1 / 0); // Increment by Infinity
      }, /Must pass a numeric value to incrementProperty/i);

      assert.equal(
        25,
        newValue,
        'Attempting to increment by non-numeric values should not increment value'
      );

      object.numberVal = 25;
      newValue = object.decrementProperty('numberVal', 5);
      assert.equal(20, newValue, 'numerical value decremented by specified increment');
      object.numberVal = 25;
      newValue = object.decrementProperty('numberVal', -5);
      assert.equal(30, newValue, 'minus numerical value decremented by specified increment');
      object.numberVal = 25;
      newValue = object.decrementProperty('numberVal', 0);
      assert.equal(25, newValue, 'zero numerical value decremented by specified increment');

      expectAssertion(function () {
        newValue = object.decrementProperty('numberVal', 0 - void 0); // Decrement by NaN
      }, /Must pass a numeric value to decrementProperty/i);

      expectAssertion(function () {
        newValue = object.decrementProperty('numberVal', 'Ember'); // Decrement by non-numeric String
      }, /Must pass a numeric value to decrementProperty/i);

      expectAssertion(function () {
        newValue = object.decrementProperty('numberVal', 1 / 0); // Decrement by Infinity
      }, /Must pass a numeric value to decrementProperty/i);

      assert.equal(
        25,
        newValue,
        'Attempting to decrement by non-numeric values should not decrement value'
      );
    }

    ['@test toggle function, should be boolean'](assert) {
      assert.equal(object.toggleProperty('toggleVal', true, false), object.get('toggleVal'));
      assert.equal(object.toggleProperty('toggleVal', true, false), object.get('toggleVal'));
      assert.equal(
        object.toggleProperty('toggleVal', undefined, undefined),
        object.get('toggleVal')
      );
    }

    async ['@test should notify array observer when array changes'](assert) {
      get(object, 'normalArray').replace(0, 0, [6]);
      await runLoopSettled();

      assert.equal(object.abnormal, 'notifiedObserver', 'observer should be notified');
    }
  }
);

moduleFor(
  'object.addObserver()',
  class extends ObservableTestCase {
    beforeEach() {
      objectE = ObservableObject.create({
        propertyVal: 'chainedProperty',
      });
      objectC = ObservableObject.create({
        objectE,
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
        },
      });
    }

    async ['@test should register an observer for a property'](assert) {
      objectC.addObserver('normal', objectC, 'action');
      objectC.set('normal', 'newValue');

      await runLoopSettled();
      assert.equal(objectC.normal1, 'newZeroValue');
    }

    async ['@test should register an observer for a property - Special case of chained property'](
      assert
    ) {
      objectC.addObserver('objectE.propertyVal', objectC, 'chainedObserver');
      objectC.objectE.set('propertyVal', 'chainedPropertyValue');
      await runLoopSettled();

      assert.equal('chainedPropertyObserved', objectC.normal2);
      objectC.normal2 = 'dependentValue';
      objectC.set('objectE', '');
      await runLoopSettled();

      assert.equal('chainedPropertyObserved', objectC.normal2);
    }
  }
);

moduleFor(
  'object.removeObserver()',
  class extends ObservableTestCase {
    beforeEach() {
      objectF = ObservableObject.create({
        propertyVal: 'chainedProperty',
      });
      objectD = ObservableObject.create({
        objectF,

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
          this.hasObserverFor('observableValue'); // Tickle 'getMembers()'
          this.removeObserver('observableValue', null, 'observer3');
        },
        observer3() {
          // Just an observer
        },
      });
    }

    async ['@test should unregister an observer for a property'](assert) {
      objectD.addObserver('normal', objectD, 'addAction');
      objectD.set('normal', 'newValue');
      await runLoopSettled();

      assert.equal(objectD.normal1, 'newZeroValue');

      objectD.set('normal1', 'zeroValue');
      await runLoopSettled();

      objectD.removeObserver('normal', objectD, 'addAction');
      objectD.set('normal', 'newValue');
      assert.equal(objectD.normal1, 'zeroValue');
    }

    async ["@test should unregister an observer for a property - special case when key has a '.' in it."](
      assert
    ) {
      objectD.addObserver('objectF.propertyVal', objectD, 'removeChainedObserver');
      objectD.objectF.set('propertyVal', 'chainedPropertyValue');
      await runLoopSettled();

      objectD.removeObserver('objectF.propertyVal', objectD, 'removeChainedObserver');
      objectD.normal2 = 'dependentValue';

      objectD.objectF.set('propertyVal', 'removedPropertyValue');
      await runLoopSettled();

      assert.equal('dependentValue', objectD.normal2);

      objectD.set('objectF', '');
      await runLoopSettled();

      assert.equal('dependentValue', objectD.normal2);
    }

    async ['@test removing an observer inside of an observer shouldn’t cause any problems'](
      assert
    ) {
      // The observable system should be protected against clients removing
      // observers in the middle of observer notification.
      let encounteredError = false;
      try {
        objectD.addObserver('observableValue', null, 'observer1');
        objectD.addObserver('observableValue', null, 'observer2');
        objectD.addObserver('observableValue', null, 'observer3');

        objectD.set('observableValue', 'hi world');

        await runLoopSettled();
      } catch (e) {
        encounteredError = true;
      }
      assert.equal(encounteredError, false);
    }
  }
);
