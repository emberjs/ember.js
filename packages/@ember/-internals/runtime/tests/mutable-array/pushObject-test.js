import { get } from '@ember/object';
import { AbstractTestCase, expectDeprecation, runLoopSettled } from 'internal-test-helpers';
import { runArrayTests, newFixture } from '../helpers/array';

class PushObjectTests extends AbstractTestCase {
  '@test returns pushed object'() {
    let exp = newFixture(1)[0];
    let obj = this.newObject([]);

    expectDeprecation(() => {
      this.assert.equal(obj.pushObject(exp), exp, 'should return pushed object');
    }, /Usage of Ember.Array methods is deprecated/);
  }

  async '@test [].pushObject(X) => [X] + notify'() {
    let before = [];
    let after = newFixture(1);
    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    expectDeprecation(() => {
      obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */
    }, /Usage of Ember.Array methods is deprecated/);

    expectDeprecation(() => {
      obj.pushObject(after[0]);
    }, /Usage of Ember.Array methods is deprecated/);

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

  async '@test [A,B,C].pushObject(X) => [A,B,C,X] + notify'() {
    let before = newFixture(3);
    let item = newFixture(1)[0];
    let after = [before[0], before[1], before[2], item];
    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    expectDeprecation(() => {
      obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */
    }, /Usage of Ember.Array methods is deprecated/);

    expectDeprecation(() => {
      obj.pushObject(item);
    }, /Usage of Ember.Array methods is deprecated/);

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
      'should NOT have notified firstObject'
    );

    obj.destroy();
  }

  async '@test [A,B,C,C].pushObject(A) => [A,B,C,C] + notify'() {
    let before = newFixture(3);
    let item = before[2]; // note same object as current tail. should end up twice
    let after = [before[0], before[1], before[2], item];
    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    expectDeprecation(() => {
      obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */
    }, /Usage of Ember.Array methods is deprecated/);

    expectDeprecation(() => {
      obj.pushObject(item);
    }, /Usage of Ember.Array methods is deprecated/);

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
      'should NOT have notified firstObject'
    );
    this.assert.equal(observer.validate('lastObject'), true, 'should have notified lastObject');

    obj.destroy();
  }
}

runArrayTests('pushObject', PushObjectTests, 'MutableArray', 'NativeArray', 'ArrayProxy');
