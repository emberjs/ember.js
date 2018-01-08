import { SuiteModuleBuilder } from '../suite';
import { get } from 'ember-metal';

const suite = SuiteModuleBuilder.create();

suite.module('reverseObjects');

suite.test('[A,B,C].reverseObjects() => [] + notify', function (assert) {
  let before = this.newFixture(3);
  let after  = [before[2], before[1], before[0]];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  assert.equal(obj.reverseObjects(), obj, 'return self');

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 0, 'should have notified length once');
  assert.equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');
  assert.equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');
});

export default suite;
