import {SuiteModuleBuilder} from 'ember-runtime/tests/suites/suite';
import {fmt} from "ember-runtime/system/string";

var suite = SuiteModuleBuilder.create();

suite.module('objectAt');

suite.test("should return object at specified index", function() {
  var expected = this.newFixture(3);
  var obj      = this.newObject(expected);
  var len      = expected.length;
  var idx;

  for (idx=0;idx<len;idx++) {
    equal(obj.objectAt(idx), expected[idx], fmt('obj.objectAt(%@) should match', [idx]));
  }

});

suite.test("should return undefined when requesting objects beyond index", function() {
  var obj;

  obj = this.newObject(this.newFixture(3));
  equal(obj.objectAt(5), undefined, 'should return undefined for obj.objectAt(5) when len = 3');

  obj = this.newObject([]);
  equal(obj.objectAt(0), undefined, 'should return undefined for obj.objectAt(0) when len = 0');
});

export default suite;
