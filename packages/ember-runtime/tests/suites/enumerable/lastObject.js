import {SuiteModuleBuilder} from 'ember-runtime/tests/suites/suite';
import {get} from 'ember-metal/property_get';
import {set} from 'ember-metal/property_set';

const suite = SuiteModuleBuilder.create();

suite.module('lastObject');

suite.test('returns last item in enumerable', function() {
  let obj = this.newObject();
  let ary = this.toArray(obj);

  equal(get(obj, 'lastObject'), ary[ary.length - 1]);
});

suite.test('returns undefined if enumerable is empty', function() {
  let obj = this.newObject([]);

  equal(get(obj, 'lastObject'), undefined);
});

suite.test('can not be set', function() {
  let obj = this.newObject();
  let ary = this.toArray(obj);

  equal(get(obj, 'lastObject'), ary[ary.length - 1]);

  throws(function() {
    set(obj, 'lastObject', 'foo!');
  }, /Cannot set read-only property "lastObject" on object/);
});

export default suite;
