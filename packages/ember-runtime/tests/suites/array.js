import {
  EnumerableTests,
  ObserverClass as EnumerableTestsObserverClass
} from './enumerable';
import indexOfTests from './array/indexOf';
import lastIndexOfTests from './array/lastIndexOf';
import objectAtTests from './array/objectAt';
import includesTests from './array/includes';
import {
  addArrayObserver,
  removeArrayObserver
} from '../../mixins/array';

const ObserverClass = EnumerableTestsObserverClass.extend({
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

const ArrayTests = EnumerableTests.extend({
  observerClass: ObserverClass
});

ArrayTests.ObserverClass = ObserverClass;

ArrayTests.importModuleTests(indexOfTests);
ArrayTests.importModuleTests(lastIndexOfTests);
ArrayTests.importModuleTests(objectAtTests);

ArrayTests.importModuleTests(includesTests);

export { ArrayTests, ObserverClass };
