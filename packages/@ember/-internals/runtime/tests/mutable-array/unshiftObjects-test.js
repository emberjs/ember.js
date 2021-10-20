import { AbstractTestCase, runLoopSettled } from 'internal-test-helpers';
import { get } from '@ember/-internals/metal';
import { runArrayTests, newFixture } from '../helpers/array';

class UnshiftObjectsTests extends AbstractTestCase {
  '@test returns receiver'() {
    let obj = this.newObject([]);
    let items = newFixture(3);

    this.assert.strictEqual(obj.unshiftObjects(items), obj, 'should return receiver');
  }

  async '@test [].unshiftObjects([A,B,C]) => [A,B,C] + notify'() {
    let before = [];
    let items = newFixture(3);
    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    obj.unshiftObjects(items);

    // flush observers
    await runLoopSettled();

    this.assert.deepEqual(this.toArray(obj), items, 'post item results');
    this.assert.strictEqual(get(obj, 'length'), items.length, 'length');

    this.assert.strictEqual(observer.timesCalled('[]'), 1, 'should have notified [] once');
    this.assert.strictEqual(
      observer.timesCalled('@each'),
      0,
      'should not have notified @each once'
    );
    this.assert.strictEqual(observer.timesCalled('length'), 1, 'should have notified length once');
    this.assert.strictEqual(
      observer.timesCalled('firstObject'),
      1,
      'should have notified firstObject once'
    );
    this.assert.strictEqual(
      observer.timesCalled('lastObject'),
      1,
      'should have notified lastObject once'
    );

    obj.destroy();
  }

  async '@test [A,B,C].unshiftObjects([X,Y]) => [X,Y,A,B,C] + notify'() {
    let before = newFixture(3);
    let items = newFixture(2);
    let after = items.concat(before);
    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    obj.unshiftObjects(items);

    // flush observers
    await runLoopSettled();

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.strictEqual(get(obj, 'length'), after.length, 'length');

    this.assert.strictEqual(observer.timesCalled('[]'), 1, 'should have notified [] once');
    this.assert.strictEqual(
      observer.timesCalled('@each'),
      0,
      'should not have notified @each once'
    );
    this.assert.strictEqual(observer.timesCalled('length'), 1, 'should have notified length once');
    this.assert.strictEqual(
      observer.timesCalled('firstObject'),
      1,
      'should have notified firstObject once'
    );

    this.assert.strictEqual(
      observer.validate('lastObject'),
      false,
      'should NOT have notified lastObject'
    );

    obj.destroy();
  }

  async '@test [A,B,C].unshiftObjects([A,B]) => [A,B,A,B,C] + notify'() {
    let before = newFixture(3);
    let items = [before[0], before[1]]; // note same object as current head. should end up twice
    let after = items.concat(before);
    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    obj.unshiftObjects(items);

    // flush observers
    await runLoopSettled();

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.strictEqual(get(obj, 'length'), after.length, 'length');

    this.assert.strictEqual(observer.timesCalled('[]'), 1, 'should have notified [] once');
    this.assert.strictEqual(
      observer.timesCalled('@each'),
      0,
      'should not have notified @each once'
    );
    this.assert.strictEqual(observer.timesCalled('length'), 1, 'should have notified length once');

    this.assert.strictEqual(
      observer.validate('firstObject'),
      true,
      'should NOT have notified firstObject'
    );
    this.assert.strictEqual(
      observer.validate('lastObject'),
      false,
      'should NOT have notified lastObject'
    );

    obj.destroy();
  }
}

runArrayTests('unshiftObjects', UnshiftObjectsTests, 'MutableArray', 'NativeArray', 'ArrayProxy');
