import { SuiteModuleBuilder } from '../suite';
import { get } from 'ember-metal';

const suite = SuiteModuleBuilder.create();

suite.module('shiftObject');

suite.test('[].shiftObject() => [] + returns undefined + NO notify', function() {
  let before = [];
  let after  = [];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  equal(obj.shiftObject(), undefined);

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(get(obj, 'length'), after.length, 'length');

  equal(observer.validate('[]', undefined, 1), false, 'should NOT have notified [] once');
  equal(observer.validate('@each', undefined, 1), false, 'should NOT have notified @each once');
  equal(observer.validate('length', undefined, 1), false, 'should NOT have notified length once');

  equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject once');
  equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject once');
});

suite.test('[X].shiftObject() => [] + notify', function() {
  let before = this.newFixture(1);
  let after  = [];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  equal(obj.shiftObject(), before[0], 'should return object');

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(get(obj, 'length'), after.length, 'length');

  equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');
  equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');
  equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');
});

suite.test('[A,B,C].shiftObject() => [B,C] + notify', function() {
  let before = this.newFixture(3);
  let after  = [before[1], before[2]];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  equal(obj.shiftObject(), before[0], 'should return object');

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(get(obj, 'length'), after.length, 'length');

  equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');
  equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');

  equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject once');
});

export default suite;
