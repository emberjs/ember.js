import { SuiteModuleBuilder } from '../suite';
import { get, set } from 'ember-metal';

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
