import {
  EnumerableTests,
  ObserverClass as EnumerableTestsObserverClass
} from 'ember-runtime/tests/suites/enumerable';
import indexOfTests from 'ember-runtime/tests/suites/array/indexOf';
import lastIndexOfTests from 'ember-runtime/tests/suites/array/lastIndexOf';
import objectAtTests from 'ember-runtime/tests/suites/array/objectAt';
import {
  addArrayObserver,
  removeArrayObserver
} from 'ember-runtime/mixins/array';

var ObserverClass = EnumerableTestsObserverClass.extend({

  observeArray(obj) {
    addArrayObserver(obj, this);
    return this;
  },

  stopObserveArray(obj) {
    removeArrayObserver(obj, this);
    return this;
  },

  arrayWillChange() {
    equal(this._before, null, 'should only call once');
    this._before = Array.prototype.slice.call(arguments);
  },

  arrayDidChange() {
    equal(this._after, null, 'should only call once');
    this._after = Array.prototype.slice.call(arguments);
  }

});

var ArrayTests = EnumerableTests.extend({

  observerClass: ObserverClass

});

ArrayTests.ObserverClass = ObserverClass;

ArrayTests.importModuleTests(indexOfTests);
ArrayTests.importModuleTests(lastIndexOfTests);
ArrayTests.importModuleTests(objectAtTests);

export {ArrayTests, ObserverClass};
