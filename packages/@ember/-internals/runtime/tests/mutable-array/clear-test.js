import { get } from '@ember/-internals/metal';
import { AbstractTestCase, runLoopSettled } from 'internal-test-helpers';
import { runArrayTests, newFixture } from '../helpers/array';

class ClearTests extends AbstractTestCase {
  async '@test [].clear() => [] + notify'() {
    let before = [];
    let after = [];
    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    // flush observers
    await runLoopSettled();

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    this.assert.strictEqual(obj.clear(), obj, 'return self');

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.strictEqual(get(obj, 'length'), after.length, 'length');

    this.assert.strictEqual(observer.validate('[]'), false, 'should NOT have notified [] once');
    this.assert.strictEqual(
      observer.validate('@each'),
      false,
      'should NOT have notified @each once'
    );
    this.assert.strictEqual(
      observer.validate('length'),
      false,
      'should NOT have notified length once'
    );
    this.assert.strictEqual(
      observer.validate('firstObject'),
      false,
      'should NOT have notified firstObject once'
    );
    this.assert.strictEqual(
      observer.validate('lastObject'),
      false,
      'should NOT have notified lastObject once'
    );

    obj.destroy();
  }

  async '@test [X].clear() => [] + notify'() {
    let obj, before, after, observer;

    before = newFixture(1);
    after = [];
    obj = this.newObject(before);
    observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');
    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    this.assert.strictEqual(obj.clear(), obj, 'return self');

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
      observer.timesCalled('lastObject'),
      1,
      'should have notified lastObject once'
    );

    obj.destroy();
  }
}

runArrayTests('clear', ClearTests, 'MutableArray', 'NativeArray', 'ArrayProxy');
