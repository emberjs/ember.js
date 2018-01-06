import { SuiteModuleBuilder } from '../suite';
import { get } from 'ember-metal';

const suite = SuiteModuleBuilder.create();

suite.module('popObject');

suite.test('[].popObject() => [] + returns undefined + NO notify', function(assert) {
  let obj = this.newObject([]);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  assert.equal(obj.popObject(), undefined, 'popObject results');

  assert.deepEqual(this.toArray(obj), [], 'post item results');

  assert.equal(observer.validate('[]'), false, 'should NOT have notified []');
  assert.equal(observer.validate('@each'), false, 'should NOT have notified @each');
  assert.equal(observer.validate('length'), false, 'should NOT have notified length');
  assert.equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject');
  assert.equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject');
});

suite.test('[X].popObject() => [] + notify', function(assert) {
  let before = this.newFixture(1);
  let after  = [];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  let ret = obj.popObject();

  assert.equal(ret, before[0], 'return object');
  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
  assert.equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');
  assert.equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');
});

suite.test('[A,B,C].popObject() => [A,B] + notify', function(assert) {
  let before = this.newFixture(3);
  let after  = [before[0], before[1]];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  let ret = obj.popObject();

  assert.equal(ret, before[2], 'return object');
  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
  assert.equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');

  assert.equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject');
});

export default suite;
