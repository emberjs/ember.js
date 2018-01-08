import { SuiteModuleBuilder } from '../suite';
import { get } from 'ember-metal';

const suite = SuiteModuleBuilder.create();

suite.module('pushObject');

suite.test('returns pushed object', function(assert) {
  let exp = this.newFixture(1)[0];
  let obj = this.newObject([]);

  assert.equal(obj.pushObject(exp), exp, 'should return pushed object');
});

suite.test('[].pushObject(X) => [X] + notify', function(assert) {
  let before = [];
  let after  = this.newFixture(1);
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.pushObject(after[0]);

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
  assert.equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');
  assert.equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');
});

suite.test('[A,B,C].pushObject(X) => [A,B,C,X] + notify', function(assert) {
  let before = this.newFixture(3);
  let item = this.newFixture(1)[0];
  let after = [before[0], before[1], before[2], item];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.pushObject(item);

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
  assert.equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');

  assert.equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject');
});

suite.test('[A,B,C,C].pushObject(A) => [A,B,C,C] + notify', function(assert) {
  let before = this.newFixture(3);
  let item = before[2]; // note same object as current tail. should end up twice
  let after = [before[0], before[1], before[2], item];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.pushObject(item);

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');

  assert.equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject');
  assert.equal(observer.validate('lastObject'), true, 'should have notified lastObject');
});

export default suite;
