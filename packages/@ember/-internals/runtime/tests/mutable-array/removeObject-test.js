import { get } from '@ember/object';
import { AbstractTestCase, expectDeprecation, runLoopSettled } from 'internal-test-helpers';
import { runArrayTests, newFixture } from '../helpers/array';

class RemoveObjectTests extends AbstractTestCase {
  '@test should return receiver'() {
    let before = newFixture(3);
    let obj = this.newObject(before);

    expectDeprecation(() => {
      this.assert.equal(obj.removeObject(before[1]), obj, 'should return receiver');
    }, /Usage of Ember.Array methods is deprecated/);

    obj.destroy();
  }

  async '@test [A,B,C].removeObject(B) => [A,C] + notify'() {
    let before = newFixture(3);
    let after = [before[0], before[2]];
    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    expectDeprecation(() => {
      obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */
    }, /Usage of Ember.Array methods is deprecated/);

    expectDeprecation(() => {
      obj.removeObject(before[1]);
    }, /Usage of Ember.Array methods is deprecated/);

    // flush observers
    await runLoopSettled();

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.equal(get(obj, 'length'), after.length, 'length');

    if (observer.isEnabled) {
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
    }

    obj.destroy();
  }

  async '@test [A,B,C].removeObject(D) => [A,B,C]'() {
    let before = newFixture(3);
    let after = before;
    let item = newFixture(1)[0];
    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    expectDeprecation(() => {
      obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */
    }, /Usage of Ember.Array methods is deprecated/);

    expectDeprecation(() => {
      obj.removeObject(item); // note: item not in set
    }, /Usage of Ember.Array methods is deprecated/);

    // flush observers
    await runLoopSettled();

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.equal(get(obj, 'length'), after.length, 'length');

    if (observer.isEnabled) {
      this.assert.equal(observer.validate('[]'), false, 'should NOT have notified []');
      this.assert.equal(observer.validate('@each'), false, 'should NOT have notified @each');
      this.assert.equal(observer.validate('length'), false, 'should NOT have notified length');

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
    }

    obj.destroy();
  }
}

runArrayTests('removeObject', RemoveObjectTests, 'MutableArray', 'NativeArray', 'ArrayProxy');
