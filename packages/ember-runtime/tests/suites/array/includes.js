import {SuiteModuleBuilder} from 'ember-runtime/tests/suites/suite';

var suite = SuiteModuleBuilder.create();

suite.module('includes');

suite.test('includes returns correct value if startAt is positive', function() {
  var data = this.newFixture(3);
  var obj  = this.newObject(data);

  equal(obj.includes(data[1], 1), true, 'should return true if included');
  equal(obj.includes(data[0], 1), false, 'should return false if not included');
});

suite.test('includes returns correct value if startAt is negative', function() {
  var data = this.newFixture(3);
  var obj  = this.newObject(data);

  equal(obj.includes(data[1], -2), true, 'should return true if included');
  equal(obj.includes(data[0], -2), false, 'should return false if not included');
});

suite.test('includes returns true if startAt + length is still negative', function() {
  var data = this.newFixture(1);
  var obj  = this.newObject(data);

  equal(obj.includes(data[0], -2), true, 'should return true if included');
  equal(obj.includes(this.newFixture(1), -2), false, 'should return false if not included');
});

suite.test('includes returns false if startAt out of bounds', function() {
  var data = this.newFixture(1);
  var obj  = this.newObject(data);

  equal(obj.includes(data[0], 2), false, 'should return false if startAt >= length');
  equal(obj.includes(this.newFixture(1), 2), false, 'should return false if startAt >= length');
});

export default suite;
