import { SuiteModuleBuilder } from '../suite';

const suite = SuiteModuleBuilder.create();

suite.module('includes');

suite.test('includes returns correct value if startAt is positive', function() {
  let data = this.newFixture(3);
  let obj  = this.newObject(data);

  equal(obj.includes(data[1], 1), true, 'should return true if included');
  equal(obj.includes(data[0], 1), false, 'should return false if not included');
});

suite.test('includes returns correct value if startAt is negative', function() {
  let data = this.newFixture(3);
  let obj  = this.newObject(data);

  equal(obj.includes(data[1], -2), true, 'should return true if included');
  equal(obj.includes(data[0], -2), false, 'should return false if not included');
});

suite.test('includes returns true if startAt + length is still negative', function() {
  let data = this.newFixture(1);
  let obj  = this.newObject(data);

  equal(obj.includes(data[0], -2), true, 'should return true if included');
  equal(obj.includes(this.newFixture(1), -2), false, 'should return false if not included');
});

suite.test('includes returns false if startAt out of bounds', function() {
  let data = this.newFixture(1);
  let obj  = this.newObject(data);

  equal(obj.includes(data[0], 2), false, 'should return false if startAt >= length');
  equal(obj.includes(this.newFixture(1), 2), false, 'should return false if startAt >= length');
});

export default suite;
