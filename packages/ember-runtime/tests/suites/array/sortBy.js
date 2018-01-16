import { SuiteModuleBuilder } from '../suite';
import { get } from 'ember-metal';

const suite = SuiteModuleBuilder.create();

suite.module('sortBy');

suite.test('sort by value of property', function(assert) {
  let obj = this.newObject([{ a: 2 }, { a: 1 }]);
  let sorted = obj.sortBy('a');

  assert.equal(get(sorted[0], 'a'), 1);
  assert.equal(get(sorted[1], 'a'), 2);
});

suite.test('supports multiple propertyNames', function(assert) {
  let obj = this.newObject([{ a: 1, b: 2 }, { a: 1, b: 1 }]);
  let sorted = obj.sortBy('a', 'b');

  assert.equal(get(sorted[0], 'b'), 1);
  assert.equal(get(sorted[1], 'b'), 2);
});

export default suite;
