import { AbstractTestCase } from 'internal-test-helpers';
import { get } from 'ember-metal';
import { runArrayTests, newFixture } from '../helpers/array';

class UnshiftObjectTests extends AbstractTestCase {
  '@test returns unshifted object'() {
    let obj = this.newObject([]);
    let item = newFixture(1)[0];

    this.assert.equal(obj.unshiftObject(item), item, 'should return unshifted object');
  }

  '@test [].unshiftObject(X) => [X] + notify'() {
    let before = [];
    let item = newFixture(1)[0];
    let after = [item];
    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    obj.unshiftObject(item);

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
  }

  '@test [A,B,C].unshiftObject(X) => [X,A,B,C] + notify'() {
    let before = newFixture(3);
    let item = newFixture(1)[0];
    let after = [item, before[0], before[1], before[2]];
    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    obj.unshiftObject(item);

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
  }

  '@test [A,B,C].unshiftObject(A) => [A,A,B,C] + notify'() {
    let before = newFixture(3);
    let item = before[0]; // note same object as current head. should end up twice
    let after = [item, before[0], before[1], before[2]];
    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    obj.unshiftObject(item);

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.equal(get(obj, 'length'), after.length, 'length');

    this.assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
    this.assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
    this.assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');

    this.assert.equal(observer.validate('firstObject'), true, 'should have notified firstObject');
    this.assert.equal(
      observer.validate('lastObject'),
      false,
      'should NOT have notified lastObject'
    );
  }
}

runArrayTests('unshiftObject', UnshiftObjectTests, 'MutableArray', 'NativeArray', 'ArrayProxy');
