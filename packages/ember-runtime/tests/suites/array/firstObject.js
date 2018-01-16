import { SuiteModuleBuilder } from '../suite';
import { get, set } from 'ember-metal';

const suite = SuiteModuleBuilder.create();

suite.module('firstObject');

suite.test('returns first item in enumerable', function(assert) {
  let obj = this.newObject();
  assert.equal(get(obj, 'firstObject'), this.toArray(obj)[0]);
});

suite.test('returns undefined if enumerable is empty', function(assert) {
  let obj = this.newObject([]);
  assert.equal(get(obj, 'firstObject'), undefined);
});

suite.test('can not be set', function(assert) {
  let obj = this.newObject([]);

  assert.equal(get(obj, 'firstObject'), this.toArray(obj)[0]);

  assert.throws(() => {
    set(obj, 'firstObject', 'foo!');
  }, /Cannot set read-only property "firstObject" on object/);
});

export default suite;
