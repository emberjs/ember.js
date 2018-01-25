import { guidFor, generateGuid } from 'ember-utils';
import { Suite } from './suite';
import { computed, get } from 'ember-metal';
import {
  addArrayObserver,
  removeArrayObserver
} from '../../mixins/array';
import EmberObject from '../../system/object';

const ArrayTestsObserverClass = EmberObject.extend({
  init() {
    this._super(...arguments);
    this.isEnabled = true;
    this.reset();
  },

  reset() {
    this._keys = {};
    this._values = {};
    this._before = null;
    this._after = null;
    return this;
  },

  observe(obj) {
    if (obj.addObserver) {
      let keys = Array.prototype.slice.call(arguments, 1);
      let loc  = keys.length;

      while (--loc >= 0) {
        obj.addObserver(keys[loc], this, 'propertyDidChange');
      }
    } else {
      this.isEnabled = false;
    }
    return this;
  },

  observeArray(obj) {
    addArrayObserver(obj, this);
    return this;
  },

  stopObserveArray(obj) {
    removeArrayObserver(obj, this);
    return this;
  },

  propertyDidChange(target, key, value) {
    if (this._keys[key] === undefined) { this._keys[key] = 0; }
    this._keys[key]++;
    this._values[key] = value;
  },

  arrayWillChange() {
    QUnit.config.current.assert.equal(this._before, null, 'should only call once');
    this._before = Array.prototype.slice.call(arguments);
  },

  arrayDidChange() {
    QUnit.config.current.assert.equal(this._after, null, 'should only call once');
    this._after = Array.prototype.slice.call(arguments);
  },

  validate(key, value) {
    if (!this.isEnabled) {
      return true;
    }

    if (!this._keys[key]) {
      return false;
    }

    if (arguments.length > 1) {
      return this._values[key] === value;
    } else {
      return true;
    }
  },

  timesCalled(key) {
    return this._keys[key] || 0;
  }
});

const ArrayTests = Suite.extend({
  /*
    __Required.__ You must implement this method to apply this mixin.

    Implement to return a new enumerable object for testing.  Should accept
    either no parameters, a single number (indicating the desired length of
    the collection) or an array of objects.

    @param {Array} content
      An array of items to include in the enumerable optionally.

    @returns {Ember.Enumerable} a new enumerable
  */
  newObject: null,

  /*
    Implement to return a set of new fixture strings that can be applied to
    the enumerable.  This may be passed into the newObject method.

    @param {Number} count
      The number of items required.

    @returns {Array} array of strings
  */
  newFixture(cnt) {
    let ret = [];
    while (--cnt >= 0) {
      ret.push(generateGuid());
    }

    return ret;
  },

  /*
    Implement to return a set of new fixture objects that can be applied to
    the enumerable.  This may be passed into the newObject method.

    @param {Number} cnt
      The number of items required.

    @returns {Array} array of objects
  */
  newObjectsFixture(cnt) {
    let ret = [];
    let item;
    while (--cnt >= 0) {
      item = {};
      guidFor(item);
      ret.push(item);
    }
    return ret;
  },

  /*
    __Required.__ You must implement this method to apply this mixin.

    Implement accept an instance of the enumerable and return an array
    containing the objects in the enumerable.  This is used only for testing
    so performance is not important.

    @param {Ember.Enumerable} enumerable
      The enumerable to convert.

    @returns {Array} array of items
  */
  toArray: null,

  /*
    Implement this method if your object can mutate internally (even if it
    does not support the MutableEnumerable API).  The method should accept
    an object of your desired type and modify it somehow.  Suite tests will
    use this to ensure that all appropriate caches, etc. clear when the
    mutation occurs.

    If you do not define this optional method, then mutation-related tests
    will be skipped.

    @param {Ember.Enumerable} enumerable
      The enumerable to mutate

    @returns {void}
  */
  mutate() {},

  /*
    Becomes true when you define a new mutate() method, indicating that
    mutation tests should run.  This is calculated automatically.

    @type Boolean
  */
  canTestMutation: computed(function() {
    return this.mutate !== ArrayTests.prototype.mutate;
  }),

  /*
    Invoked to actually run the test - overridden by mixins
  */
  run() {},

  /*
    Creates a new observer object for testing.  You can add this object as an
    observer on an array and it will record results anytime it is invoked.
    After running the test, call the validate() method on the observer to
    validate the results.
  */
  newObserver(/* obj */) {
    let ret = get(this, 'observerClass').create();

    if (arguments.length > 0) {
      ret.observe.apply(ret, arguments);
    }

    return ret;
  },

  observerClass: ArrayTestsObserverClass
});

import anyTests from './array/any';
import compactTests from './array/compact';
import everyTests from './array/every';
import filterTests from './array/filter';
import findTests from './array/find';
import firstObjectTests from './array/firstObject';
import forEachTests from './array/forEach';
import includesTests from './array/includes';
import indexOfTests from './array/indexOf';
import invokeTests from './array/invoke';
import isAnyTests from './array/isAny';
import lastIndexOfTests from './array/lastIndexOf';
import lastObjectTests from './array/lastObject';
import mapByTests from './array/mapBy';
import mapTests from './array/map';
import objectAtTests from './array/objectAt';
import reduceTests from './array/reduce';
import rejectTests from './array/reject';
import sortByTests from './array/sortBy';
import toArrayTests from './array/toArray';
import uniqByTests from './array/uniqBy';
import uniqTests from './array/uniq';
import withoutTests from './array/without';

ArrayTests.importModuleTests(anyTests);
ArrayTests.importModuleTests(compactTests);
ArrayTests.importModuleTests(everyTests);
ArrayTests.importModuleTests(filterTests);
ArrayTests.importModuleTests(findTests);
ArrayTests.importModuleTests(firstObjectTests);
ArrayTests.importModuleTests(forEachTests);
ArrayTests.importModuleTests(includesTests);
ArrayTests.importModuleTests(indexOfTests);
ArrayTests.importModuleTests(invokeTests);
ArrayTests.importModuleTests(isAnyTests);
ArrayTests.importModuleTests(lastIndexOfTests);
ArrayTests.importModuleTests(lastObjectTests);
ArrayTests.importModuleTests(mapByTests);
ArrayTests.importModuleTests(mapTests);
ArrayTests.importModuleTests(objectAtTests);
ArrayTests.importModuleTests(reduceTests);
ArrayTests.importModuleTests(rejectTests);
ArrayTests.importModuleTests(sortByTests);
ArrayTests.importModuleTests(toArrayTests);
ArrayTests.importModuleTests(uniqByTests);
ArrayTests.importModuleTests(uniqTests);
ArrayTests.importModuleTests(withoutTests);

export { ArrayTests };
