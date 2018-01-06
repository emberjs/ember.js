import { SuiteModuleBuilder } from '../suite';
import { get } from 'ember-metal';

const suite = SuiteModuleBuilder.create();

suite.module('shiftObject');

suite.test('[].shiftObject() => [] + returns undefined + NO notify', function(assert) {
  let before = [];
  let after  = [];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  assert.equal(obj.shiftObject(), undefined);

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.validate('[]', undefined, 1), false, 'should NOT have notified [] once');
  assert.equal(observer.validate('@each', undefined, 1), false, 'should NOT have notified @each once');
  assert.equal(observer.validate('length', undefined, 1), false, 'should NOT have notified length once');

  assert.equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject once');
  assert.equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject once');
});

suite.test('[X].shiftObject() => [] + notify', function(assert) {
  let before = this.newFixture(1);
  let after  = [];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  assert.equal(obj.shiftObject(), before[0], 'should return object');

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
  assert.equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');
  assert.equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');
});

suite.test('[A,B,C].shiftObject() => [B,C] + notify', function(assert) {
  let before = this.newFixture(3);
  let after  = [before[1], before[2]];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  assert.equal(obj.shiftObject(), before[0], 'should return object');

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
  assert.equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');

  assert.equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject once');
});

export default suite;
