import {
  EnumerableTests,
  ObserverClass as EnumerableTestsObserverClass
} from 'ember-runtime/tests/suites/enumerable';
import indexOfTests from 'ember-runtime/tests/suites/array/indexOf';
import lastIndexOfTests from 'ember-runtime/tests/suites/array/lastIndexOf';
import objectAtTests from 'ember-runtime/tests/suites/array/objectAt';

var ObserverClass = EnumerableTestsObserverClass.extend({
  observeArray: function(obj) {
    obj.addArrayObserver(this);
    return this;
  },

  stopObserveArray: function(obj) {
    obj.removeArrayObserver(this);
    return this;
  },

  arrayWillChange: function() {
    equal(this._before, null, 'should only call once');
    this._before = Array.prototype.slice.call(arguments);
  },

  arrayDidChange: function() {
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
