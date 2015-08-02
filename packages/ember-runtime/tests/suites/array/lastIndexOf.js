import {SuiteModuleBuilder} from 'ember-runtime/tests/suites/suite';

var suite = SuiteModuleBuilder.create();

suite.module('lastIndexOf');

suite.test('should return index of object\'s last occurrence', function() {
  var expected = this.newFixture(3);
  var obj      = this.newObject(expected);
  var len      = 3;
  var idx;

  for (idx = 0;idx < len;idx++) {
    equal(obj.lastIndexOf(expected[idx]), idx, `obj.lastIndexOf(${expected[idx]}) should match idx`);
  }
});

suite.test('should return index of object\'s last occurrence even startAt search location is equal to length', function() {
  var expected = this.newFixture(3);
  var obj      = this.newObject(expected);
  var len      = 3;
  var idx;

  for (idx = 0;idx < len;idx++) {
    equal(obj.lastIndexOf(expected[idx], len), idx, `obj.lastIndexOfs(${expected[idx]}) should match idx`);
  }
});

suite.test('should return index of object\'s last occurrence even startAt search location is greater than length', function() {
  var expected = this.newFixture(3);
  var obj      = this.newObject(expected);
  var len      = 3;
  var idx;

  for (idx = 0;idx < len;idx++) {
    equal(obj.lastIndexOf(expected[idx], len + 1), idx, `obj.lastIndexOf(${expected[idx]}) should match idx`);
  }
});

suite.test('should return -1 when no match is found', function() {
  var obj = this.newObject(this.newFixture(3));
  var foo = {};

  equal(obj.lastIndexOf(foo), -1, 'obj.lastIndexOf(foo) should be -1');
});

suite.test('should return -1 when no match is found even startAt search location is equal to length', function() {
  var obj = this.newObject(this.newFixture(3));
  var foo = {};

  equal(obj.lastIndexOf(foo, obj.length), -1, 'obj.lastIndexOf(foo) should be -1');
});

suite.test('should return -1 when no match is found even startAt search location is greater than length', function() {
  var obj = this.newObject(this.newFixture(3));
  var foo = {};

  equal(obj.lastIndexOf(foo, obj.length + 1), -1, 'obj.lastIndexOf(foo) should be -1');
});

export default suite;
