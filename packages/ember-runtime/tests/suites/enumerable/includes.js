import { SuiteModuleBuilder } from '../suite';

const suite = SuiteModuleBuilder.create();

suite.module('includes');

suite.test('includes returns true if item is in enumerable', function() {
  let data = this.newFixture(1);
  let obj  = this.newObject([...data, NaN, undefined, null]);

  equal(obj.includes(data[0]), true, 'should return true if included');
  equal(obj.includes(NaN), true, 'should return true if NaN included');
  equal(obj.includes(undefined), true, 'should return true if undefined included');
  equal(obj.includes(null), true, 'should return true if null included');
});

suite.test('includes returns false if item is not in enumerable', function() {
  let data = this.newFixture(1);
  let obj  = this.newObject([...this.newFixture(3), null]);

  equal(obj.includes(data[0]), false, 'should return false if not included');
  equal(obj.includes(undefined), false, 'should return false if undefined not included but null is included');
});

export default suite;
