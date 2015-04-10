import {SuiteModuleBuilder} from 'ember-runtime/tests/suites/suite';

var suite = SuiteModuleBuilder.create();

suite.module('indexOf');

suite.test("should return index of object", function() {
  var expected = this.newFixture(3);
  var obj      = this.newObject(expected);
  var len      = 3;
  var idx;

  for (idx=0;idx<len;idx++) {
    equal(obj.indexOf(expected[idx]), idx, `obj.indexOf(${expected[idx]}) should match idx`);
  }

});

suite.test("should return -1 when requesting object not in index", function() {
  var obj = this.newObject(this.newFixture(3));
  var foo = {};

  equal(obj.indexOf(foo), -1, 'obj.indexOf(foo) should be < 0');
});

export default suite;
