import { AbstractTestCase, runLoopSettled } from 'internal-test-helpers';
import { runArrayTests, newFixture } from '../helpers/array';
import { get } from '@ember/object';

class ShiftObjectTests extends AbstractTestCase {
  async '@test [].shiftObject() => [] + returns undefined + NO notify'() {
    let before = [];
    let after = [];
    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    this.assert.equal(obj.shiftObject(), undefined);

    // flush observers
    await runLoopSettled();

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.equal(get(obj, 'length'), after.length, 'length');

    this.assert.equal(
      observer.validate('[]', undefined, 1),
      false,
      'should NOT have notified [] once'
    );
    this.assert.equal(
      observer.validate('@each', undefined, 1),
      false,
      'should NOT have notified @each once'
    );
    this.assert.equal(
      observer.validate('length', undefined, 1),
      false,
      'should NOT have notified length once'
    );

    this.assert.equal(
      observer.validate('firstObject'),
      false,
      'should NOT have notified firstObject once'
    );
    this.assert.equal(
      observer.validate('lastObject'),
      false,
      'should NOT have notified lastObject once'
    );

    obj.destroy();
  }

  async '@test [X].shiftObject() => [] + notify'() {
    let before = newFixture(1);
    let after = [];
    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    this.assert.equal(obj.shiftObject(), before[0], 'should return object');

    // flush observers
    await runLoopSettled();

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.equal(get(obj, 'length'), after.length, 'length');

    this.assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
    this.assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
    this.assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
    this.assert.equal(
      observer.timesCalled('firstObject'),
      1,
      'should have notified firstObject once'
    );
    this.assert.equal(
      observer.timesCalled('lastObject'),
      1,
      'should have notified lastObject once'
    );

    obj.destroy();
  }

  async '@test [A,B,C].shiftObject() => [B,C] + notify'() {
    let before = newFixture(3);
    let after = [before[1], before[2]];
    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    this.assert.equal(obj.shiftObject(), before[0], 'should return object');

    // flush observers
    await runLoopSettled();

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.equal(get(obj, 'length'), after.length, 'length');

    this.assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
    this.assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
    this.assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
    this.assert.equal(
      observer.timesCalled('firstObject'),
      1,
      'should have notified firstObject once'
    );

    this.assert.equal(
      observer.validate('lastObject'),
      false,
      'should NOT have notified lastObject once'
    );

    obj.destroy();
  }
}

runArrayTests('shiftObject', ShiftObjectTests, 'MutableArray', 'NativeArray', 'ArrayProxy');
