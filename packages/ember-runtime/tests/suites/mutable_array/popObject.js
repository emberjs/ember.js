import { SuiteModuleBuilder } from '../suite';
import { get } from 'ember-metal';

const suite = SuiteModuleBuilder.create();

suite.module('popObject');

suite.test('[].popObject() => [] + returns undefined + NO notify', function() {
  let obj = this.newObject([]);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  equal(obj.popObject(), undefined, 'popObject results');

  deepEqual(this.toArray(obj), [], 'post item results');

  equal(observer.validate('[]'), false, 'should NOT have notified []');
  equal(observer.validate('@each'), false, 'should NOT have notified @each');
  equal(observer.validate('length'), false, 'should NOT have notified length');
  equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject');
  equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject');
});

suite.test('[X].popObject() => [] + notify', function() {
  let before = this.newFixture(1);
  let after  = [];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  let ret = obj.popObject();

  equal(ret, before[0], 'return object');
  deepEqual(this.toArray(obj), after, 'post item results');
  equal(get(obj, 'length'), after.length, 'length');

  equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');
  equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');
  equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');
});

suite.test('[A,B,C].popObject() => [A,B] + notify', function() {
  let before = this.newFixture(3);
  let after  = [before[0], before[1]];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  let ret = obj.popObject();

  equal(ret, before[2], 'return object');
  deepEqual(this.toArray(obj), after, 'post item results');
  equal(get(obj, 'length'), after.length, 'length');

  equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');
  equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');

  equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject');
});

export default suite;
