import {SuiteModuleBuilder} from 'ember-runtime/tests/suites/suite';
import {get} from 'ember-metal/property_get';

var suite = SuiteModuleBuilder.create();

suite.module('lastObject');

suite.test('returns last item in enumerable', function() {
  var obj = this.newObject();
  var ary = this.toArray(obj);

  equal(get(obj, 'lastObject'), ary[ary.length-1]);
});

suite.test('returns undefined if enumerable is empty', function() {
  var obj = this.newObject([]);

  equal(get(obj, 'lastObject'), undefined);
});

export default suite;
