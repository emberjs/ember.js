import { AbstractTestCase, runLoopSettled } from 'internal-test-helpers';
import { runArrayTests, newFixture } from '../helpers/array';
import { removeAt } from '@ember/array';
import { get } from '@ember/object';

class RemoveAtTests extends AbstractTestCase {
  async '@test removeAt([X], 0) => [] + notify'() {
    let before = newFixture(1);
    let after = [];
    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    this.assert.equal(removeAt(obj, 0), obj, 'return self');

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

  '@test removeAt([], 200) => OUT_OF_RANGE_EXCEPTION exception'() {
    let obj = this.newObject([]);
    expectAssertion(() => removeAt(obj, 200), /`removeAt` index provided is out of range/);
  }

  async '@test removeAt([A,B], 0) => [B] + notify'() {
    let before = newFixture(2);
    let after = [before[1]];
    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    this.assert.equal(removeAt(obj, 0), obj, 'return self');

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
      'should NOT have notified lastObject'
    );

    obj.destroy();
  }

  async '@test removeAt([A,B], 1) => [A] + notify'() {
    let before = newFixture(2);
    let after = [before[0]];
    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    this.assert.equal(removeAt(obj, 1), obj, 'return self');

    // flush observers
    await runLoopSettled();

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.equal(get(obj, 'length'), after.length, 'length');

    this.assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
    this.assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
    this.assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
    this.assert.equal(
      observer.timesCalled('lastObject'),
      1,
      'should have notified lastObject once'
    );

    this.assert.equal(
      observer.validate('firstObject'),
      false,
      'should NOT have notified firstObject once'
    );

    obj.destroy();
  }

  async '@test removeAt([A,B,C], 1) => [A,C] + notify'() {
    let before = newFixture(3);
    let after = [before[0], before[2]];
    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    this.assert.equal(removeAt(obj, 1), obj, 'return self');

    // flush observers
    await runLoopSettled();

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.equal(get(obj, 'length'), after.length, 'length');

    this.assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
    this.assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
    this.assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');

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

  async '@test removeAt([A,B,C,D], 1,2) => [A,D] + notify'() {
    let before = newFixture(4);
    let after = [before[0], before[3]];
    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    this.assert.equal(removeAt(obj, 1, 2), obj, 'return self');

    // flush observers
    await runLoopSettled();

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.equal(get(obj, 'length'), after.length, 'length');

    this.assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
    this.assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
    this.assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');

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

  async '@test [A,B,C,D].removeAt(1,2) => [A,D] + notify'() {
    let obj, before, after, observer;

    before = newFixture(4);
    after = [before[0], before[3]];
    obj = this.newObject(before);
    observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');
    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    this.assert.equal(obj.removeAt(1, 2), obj, 'return self');

    // flush observers
    await runLoopSettled();

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.equal(get(obj, 'length'), after.length, 'length');

    this.assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
    this.assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
    this.assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');

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
}

runArrayTests('removeAt', RemoveAtTests, 'MutableArray', 'NativeArray', 'ArrayProxy');
