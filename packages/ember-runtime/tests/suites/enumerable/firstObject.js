import {SuiteModuleBuilder} from 'ember-runtime/tests/suites/suite';
import {get} from 'ember-metal/property_get';
import {set} from 'ember-metal/property_set';

const suite = SuiteModuleBuilder.create();

suite.module('firstObject');

suite.test('returns first item in enumerable', function() {
  let obj = this.newObject();
  equal(get(obj, 'firstObject'), this.toArray(obj)[0]);
});

suite.test('returns undefined if enumerable is empty', function() {
  let obj = this.newObject([]);
  equal(get(obj, 'firstObject'), undefined);
});

suite.test('can not be set', function() {
  let obj = this.newObject([]);

  equal(get(obj, 'firstObject'), this.toArray(obj)[0]);

  throws(() => {
    set(obj, 'firstObject', 'foo!');
  }, /Cannot set read-only property "firstObject" on object/);
});

export default suite;
