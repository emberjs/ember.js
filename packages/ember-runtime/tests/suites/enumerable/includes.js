import { SuiteModuleBuilder } from '../suite';

const suite = SuiteModuleBuilder.create();

suite.module('includes');

suite.test('includes returns true if item is in enumerable', function(assert) {
  let data = this.newFixture(1);
  let obj  = this.newObject([...data, NaN, undefined, null]);

  assert.equal(obj.includes(data[0]), true, 'should return true if included');
  assert.equal(obj.includes(NaN), true, 'should return true if NaN included');
  assert.equal(obj.includes(undefined), true, 'should return true if undefined included');
  assert.equal(obj.includes(null), true, 'should return true if null included');
});

suite.test('includes returns false if item is not in enumerable', function(assert) {
  let data = this.newFixture(1);
  let obj  = this.newObject([...this.newFixture(3), null]);

  assert.equal(obj.includes(data[0]), false, 'should return false if not included');
  assert.equal(obj.includes(undefined), false, 'should return false if undefined not included but null is included');
});

export default suite;
