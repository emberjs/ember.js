import { SuiteModuleBuilder } from 'ember-runtime/tests/suites/suite';
import { get } from 'ember-metal/property_get';

var suite = SuiteModuleBuilder.create();

suite.module('sortBy');

suite.test('sort by value of property', function() {
  var obj = this.newObject([{ a: 2 },{ a: 1 }]);
  var sorted = obj.sortBy('a');

  equal(get(sorted[0], 'a'), 1);
  equal(get(sorted[1], 'a'), 2);
});

suite.test('supports multiple propertyNames', function() {
  var obj = this.newObject([{ a: 1, b: 2 }, { a: 1, b: 1 }]);
  var sorted = obj.sortBy('a', 'b');

  equal(get(sorted[0], 'b'), 1);
  equal(get(sorted[1], 'b'), 2);
});

export default suite;
