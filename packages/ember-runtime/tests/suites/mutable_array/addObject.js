import { get } from 'ember-metal';
import { SuiteModuleBuilder } from '../suite';

const suite = SuiteModuleBuilder.create();

suite.module('addObject');

suite.test('should return receiver', function() {
  let before = this.newFixture(3);
  let obj    = this.newObject(before);
  equal(obj.addObject(before[1]), obj, 'should return receiver');
});

suite.test('[A,B].addObject(C) => [A,B,C] + notify', function() {
  let before = this.newFixture(2);
  let item   = this.newFixture(1)[0];
  let after  = [before[0], before[1], item];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.addObject(item);

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
    equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
    equal(observer.timesCalled('length'), 1, 'should have notified length once');
    equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');

    equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject once');
  }
});

suite.test('[A,B,C].addObject(A) => [A,B,C] + NO notify', function() {
  let before = this.newFixture(3);
  let after  = before;
  let item   = before[0];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.addObject(item); // note: item in set

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equal(observer.validate('[]'), false, 'should NOT have notified []');
    equal(observer.validate('@each'), false, 'should NOT have notified @each');
    equal(observer.validate('length'), false, 'should NOT have notified length');
    equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject once');
    equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject once');
  }
});

export default suite;
