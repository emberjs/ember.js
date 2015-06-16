import {SuiteModuleBuilder} from 'ember-runtime/tests/suites/suite';

var suite = SuiteModuleBuilder.create();

suite.module('copy');

suite.test('should return an equivalent copy', function() {
  var obj = this.newObject();
  var copy = obj.copy();
  ok(this.isEqual(obj, copy), 'old object and new object should be equivalent');
});

export default suite;
