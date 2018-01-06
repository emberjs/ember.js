import { get } from 'ember-metal';
import { SuiteModuleBuilder } from '../suite';

const suite = SuiteModuleBuilder.create();

suite.module('clear');

suite.test('[].clear() => [] + notify', function (assert) {
  let before = [];
  let after  = [];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  assert.equal(obj.clear(), obj, 'return self');

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.validate('[]'), false, 'should NOT have notified [] once');
  assert.equal(observer.validate('@each'), false, 'should NOT have notified @each once');
  assert.equal(observer.validate('length'), false, 'should NOT have notified length once');
  assert.equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject once');
  assert.equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject once');
});

suite.test('[X].clear() => [] + notify', function (assert) {
  var obj, before, after, observer;

  before = this.newFixture(1);
  after  = [];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');
  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  assert.equal(obj.clear(), obj, 'return self');

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
  assert.equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');
  assert.equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');
});

export default suite;
