import { Suite } from 'ember-runtime/tests/suites/suite';
import EmberObject from 'ember-runtime/system/object';
import {guidFor, generateGuid} from 'ember-metal/utils';
import {computed} from 'ember-metal/computed';
import {get} from 'ember-metal/property_get';
import { addBeforeObserver } from 'ember-metal/observer';

var ObserverClass = EmberObject.extend({

  _keysBefore: null,
  _keys: null,
  _values: null,
  _before : null,
  _after: null,

  isEnabled: true,

  init() {
    this._super.apply(this, arguments);
    this.reset();
  },


  propertyWillChange(target, key) {
    if (this._keysBefore[key] === undefined) { this._keysBefore[key] = 0; }
    this._keysBefore[key]++;
  },

  /*
    Invoked when the property changes.  Just records the parameters for
    later analysis.
  */
  propertyDidChange(target, key, value) {
    if (this._keys[key] === undefined) { this._keys[key] = 0; }
    this._keys[key]++;
    this._values[key] = value;
  },

  /*
    Resets the recorded results for another run.

    @returns {Object} receiver
  */
  reset() {
    this._keysBefore = {};
    this._keys = {};
    this._values = {};
    this._before = null;
    this._after = null;
    return this;
  },


  observeBefore(obj) {
    var keys = Array.prototype.slice.call(arguments, 1);
    var loc  = keys.length;
    while (--loc>=0) {
      addBeforeObserver(obj, keys[loc], this, 'propertyWillChange');
    }

    return this;
  },

  /*
    Begins observing the passed key names on the passed object.  Any changes
    on the named properties will be recorded.

    @param {Ember.Enumerable} obj
      The enumerable to observe.

    @returns {Object} receiver
  */
  observe(obj) {
    if (obj.addObserver) {
      var keys = Array.prototype.slice.call(arguments, 1);
      var loc  = keys.length;

      while (--loc >= 0) {
        obj.addObserver(keys[loc], this, 'propertyDidChange');
      }
    } else {
      this.isEnabled = false;
    }
    return this;
  },

  /*
    Returns true if the passed key was invoked.  If you pass a value as
    well then validates that the values match.

    @param {String} key
      Key to validate

    @param {Object} value
      (Optional) value

    @returns {Boolean}
  */
  validate(key, value) {
    if (!this.isEnabled) {
      return true;
    }

    if (!this._keys[key]) {
      return false;
    }

    if (arguments.length>1) {
      return this._values[key] === value;
    } else {
      return true;
    }
  },

  /*
    Returns times the before observer as invoked.

    @param {String} key
      Key to check
  */
  timesCalledBefore(key) {
    return this._keysBefore[key] || 0;
  },

  /*
    Returns times the observer as invoked.

    @param {String} key
      Key to check
  */
  timesCalled(key) {
    return this._keys[key] || 0;
  },

  /*
    begins acting as an enumerable observer.
  */
  observeEnumerable(obj) {
    obj.addEnumerableObserver(this);
    return this;
  },

  stopObserveEnumerable(obj) {
    obj.removeEnumerableObserver(this);
    return this;
  },

  enumerableWillChange() {
    equal(this._before, null, 'should only call once');
    this._before = Array.prototype.slice.call(arguments);
  },

  enumerableDidChange() {
    equal(this._after, null, 'should only call once');
    this._after = Array.prototype.slice.call(arguments);
  }

});


var EnumerableTests = Suite.extend({
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
    var ret = [];
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
    var ret = [];
    var item;
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
    return this.mutate !== EnumerableTests.prototype.mutate;
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
  newObserver(obj) {
    var ret = get(this, 'observerClass').create();
    if (arguments.length>0) {
      ret.observeBefore.apply(ret, arguments);
    }

    if (arguments.length>0) {
      ret.observe.apply(ret, arguments);
    }

    return ret;
  },

  observerClass: ObserverClass
});

import anyTests         from 'ember-runtime/tests/suites/enumerable/any';
import isAnyTests       from 'ember-runtime/tests/suites/enumerable/is_any';
import compactTests     from 'ember-runtime/tests/suites/enumerable/compact';
import containsTests    from 'ember-runtime/tests/suites/enumerable/contains';
import everyTests       from 'ember-runtime/tests/suites/enumerable/every';
import filterTests      from 'ember-runtime/tests/suites/enumerable/filter';
import findTests        from 'ember-runtime/tests/suites/enumerable/find';
import firstObjectTests from 'ember-runtime/tests/suites/enumerable/firstObject';
import forEachTests     from 'ember-runtime/tests/suites/enumerable/forEach';
import mapByTests       from 'ember-runtime/tests/suites/enumerable/mapBy';
import invokeTests      from 'ember-runtime/tests/suites/enumerable/invoke';
import lastObjectTests  from 'ember-runtime/tests/suites/enumerable/lastObject';
import mapTests         from 'ember-runtime/tests/suites/enumerable/map';
import reduceTests      from 'ember-runtime/tests/suites/enumerable/reduce';
import rejectTests      from 'ember-runtime/tests/suites/enumerable/reject';
import sortByTests      from 'ember-runtime/tests/suites/enumerable/sortBy';
import toArrayTests     from 'ember-runtime/tests/suites/enumerable/toArray';
import uniqTests        from 'ember-runtime/tests/suites/enumerable/uniq';
import withoutTests     from 'ember-runtime/tests/suites/enumerable/without';

EnumerableTests.importModuleTests(anyTests);
EnumerableTests.importModuleTests(isAnyTests);
EnumerableTests.importModuleTests(compactTests);
EnumerableTests.importModuleTests(containsTests);
EnumerableTests.importModuleTests(everyTests);
EnumerableTests.importModuleTests(filterTests);
EnumerableTests.importModuleTests(findTests);
EnumerableTests.importModuleTests(firstObjectTests);
EnumerableTests.importModuleTests(forEachTests);
EnumerableTests.importModuleTests(mapByTests);
EnumerableTests.importModuleTests(invokeTests);
EnumerableTests.importModuleTests(lastObjectTests);
EnumerableTests.importModuleTests(mapTests);
EnumerableTests.importModuleTests(reduceTests);
EnumerableTests.importModuleTests(rejectTests);
EnumerableTests.importModuleTests(sortByTests);
EnumerableTests.importModuleTests(toArrayTests);
EnumerableTests.importModuleTests(uniqTests);
EnumerableTests.importModuleTests(withoutTests);

export default EnumerableTests;
export {EnumerableTests, ObserverClass};
