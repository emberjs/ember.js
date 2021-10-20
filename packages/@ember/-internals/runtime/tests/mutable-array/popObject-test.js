import { get } from '@ember/-internals/metal';
import { AbstractTestCase, runLoopSettled } from 'internal-test-helpers';
import { runArrayTests, newFixture } from '../helpers/array';

class PopObjectTests extends AbstractTestCase {
  async '@test [].popObject() => [] + returns undefined + NO notify'() {
    let obj = this.newObject([]);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    this.assert.strictEqual(obj.popObject(), undefined, 'popObject results');

    // flush observers
    await runLoopSettled();

    this.assert.deepEqual(this.toArray(obj), [], 'post item results');

    this.assert.strictEqual(observer.validate('[]'), false, 'should NOT have notified []');
    this.assert.strictEqual(observer.validate('@each'), false, 'should NOT have notified @each');
    this.assert.strictEqual(observer.validate('length'), false, 'should NOT have notified length');
    this.assert.strictEqual(
      observer.validate('firstObject'),
      false,
      'should NOT have notified firstObject'
    );
    this.assert.strictEqual(
      observer.validate('lastObject'),
      false,
      'should NOT have notified lastObject'
    );

    obj.destroy();
  }

  async '@test [X].popObject() => [] + notify'() {
    let before = newFixture(1);
    let after = [];
    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    let ret = obj.popObject();

    // flush observers
    await runLoopSettled();

    this.assert.strictEqual(ret, before[0], 'return object');
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

  async '@test [A,B,C].popObject() => [A,B] + notify'() {
    let before = newFixture(3);
    let after = [before[0], before[1]];
    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    let ret = obj.popObject();

    // flush observers
    await runLoopSettled();

    this.assert.strictEqual(ret, before[2], 'return object');
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
      observer.timesCalled('lastObject'),
      1,
      'should have notified lastObject once'
    );

    this.assert.strictEqual(
      observer.validate('firstObject'),
      false,
      'should NOT have notified firstObject'
    );

    obj.destroy();
  }
}

runArrayTests('popObject', PopObjectTests, 'MutableArray', 'NativeArray', 'ArrayProxy');
