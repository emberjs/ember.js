import { SuiteModuleBuilder } from '../suite';
import { get } from 'ember-metal';

const suite = SuiteModuleBuilder.create();

suite.module('sortBy');

suite.test('sort by value of property', function() {
  let obj = this.newObject([{ a: 2 }, { a: 1 }]);
  let sorted = obj.sortBy('a');

  equal(get(sorted[0], 'a'), 1);
  equal(get(sorted[1], 'a'), 2);
});

suite.test('supports multiple propertyNames', function() {
  let obj = this.newObject([{ a: 1, b: 2 }, { a: 1, b: 1 }]);
  let sorted = obj.sortBy('a', 'b');

  equal(get(sorted[0], 'b'), 1);
  equal(get(sorted[1], 'b'), 2);
});

export default suite;
