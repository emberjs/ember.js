import { SuiteModuleBuilder } from '../suite';
import { get, set } from 'ember-metal';

const suite = SuiteModuleBuilder.create();

suite.module('lastObject');

suite.test('returns last item in enumerable', function(assert) {
  let obj = this.newObject();
  let ary = this.toArray(obj);

  assert.equal(get(obj, 'lastObject'), ary[ary.length - 1]);
});

suite.test('returns undefined if enumerable is empty', function(assert) {
  let obj = this.newObject([]);

  assert.equal(get(obj, 'lastObject'), undefined);
});

suite.test('can not be set', function(assert) {
  let obj = this.newObject();
  let ary = this.toArray(obj);

  assert.equal(get(obj, 'lastObject'), ary[ary.length - 1]);

  assert.throws(function() {
    set(obj, 'lastObject', 'foo!');
  }, /Cannot set read-only property "lastObject" on object/);
});

export default suite;
