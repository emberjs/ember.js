import { SuiteModuleBuilder } from '../suite';
import { get } from 'ember-metal';

const suite = SuiteModuleBuilder.create();

suite.module('unshiftObject');

suite.test('returns unshifted object', function(assert) {
  let obj = this.newObject([]);
  let item = this.newFixture(1)[0];

  assert.equal(obj.unshiftObject(item), item, 'should return unshifted object');
});

suite.test('[].unshiftObject(X) => [X] + notify', function(assert) {
  let before = [];
  let item = this.newFixture(1)[0];
  let after  = [item];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.unshiftObject(item);

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
  assert.equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');
  assert.equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');
});

suite.test('[A,B,C].unshiftObject(X) => [X,A,B,C] + notify', function(assert) {
  let before = this.newFixture(3);
  let item = this.newFixture(1)[0];
  let after  = [item, before[0], before[1], before[2]];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.unshiftObject(item);

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
  assert.equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');

  assert.equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject');
});

suite.test('[A,B,C].unshiftObject(A) => [A,A,B,C] + notify', function(assert) {
  let before = this.newFixture(3);
  let item = before[0]; // note same object as current head. should end up twice
  let after = [item, before[0], before[1], before[2]];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.unshiftObject(item);

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');

  assert.equal(observer.validate('firstObject'), true, 'should have notified firstObject');
  assert.equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject');
});

export default suite;
