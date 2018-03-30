import { get } from 'ember-metal';
import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests, newFixture, newObjectsFixture } from '../helpers/array';
import { A as emberA } from '../../mixins/array';

class RemoveObjectsTests extends AbstractTestCase {
  '@test should return receiver'() {
    let before = emberA(newFixture(3));
    let obj = before;

    this.assert.equal(obj.removeObjects(before[1]), obj, 'should return receiver');
  }

  '@test [A,B,C].removeObjects([B]) => [A,C] + notify'() {
    let before = emberA(newFixture(3));
    let after = [before[0], before[2]];
    let obj = before;
    let observer = this.newObserver(obj, '[]', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); // Prime the cache

    obj.removeObjects([before[1]]);

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.equal(get(obj, 'length'), after.length, 'length');

    if (observer.isEnabled) {
      this.assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
      this.assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');

      this.assert.equal(
        observer.validate('firstObject'),
        false,
        'should NOT have notified firstObject'
      );
      this.assert.equal(
        observer.validate('lastObject'),
        false,
        'should NOT have notified lastObject'
      );
    }
  }

  '@test [{A},{B},{C}].removeObjects([{B}]) => [{A},{C}] + notify'() {
    let before = emberA(newObjectsFixture(3));
    let after = [before[0], before[2]];
    let obj = before;
    let observer = this.newObserver(obj, '[]', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); // Prime the cache

    obj.removeObjects([before[1]]);

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.equal(get(obj, 'length'), after.length, 'length');

    if (observer.isEnabled) {
      this.assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
      this.assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');

      this.assert.equal(
        observer.validate('firstObject'),
        false,
        'should NOT have notified firstObject'
      );
      this.assert.equal(
        observer.validate('lastObject'),
        false,
        'should NOT have notified lastObject'
      );
    }
  }

  '@test [A,B,C].removeObjects([A,B]) => [C] + notify'() {
    let before = emberA(newFixture(3));
    let after = [before[2]];
    let obj = before;
    let observer = this.newObserver(obj, '[]', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); // Prime the cache

    obj.removeObjects([before[0], before[1]]);

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.equal(get(obj, 'length'), after.length, 'length');

    if (observer.isEnabled) {
      this.assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
      this.assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');

      this.assert.equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject');
      this.assert.equal(
        observer.validate('lastObject'),
        false,
        'should NOT have notified lastObject'
      );
    }
  }

  '@test [{A},{B},{C}].removeObjects([{A},{B}]) => [{C}] + notify'() {
    let before = emberA(newObjectsFixture(3));
    let after = [before[2]];
    let obj = before;
    let observer = this.newObserver(obj, '[]', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); // Prime the cache

    obj.removeObjects([before[0], before[1]]);

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.equal(get(obj, 'length'), after.length, 'length');

    if (observer.isEnabled) {
      this.assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
      this.assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');

      this.assert.equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject');
      this.assert.equal(
        observer.validate('lastObject'),
        false,
        'should NOT have notified lastObject'
      );
    }
  }

  '@test [A,B,C].removeObjects([A,B,C]) => [] + notify'() {
    let before = emberA(newFixture(3));
    let after = [];
    let obj = before;
    let observer = this.newObserver(obj, '[]', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); // Prime the cache

    obj.removeObjects([before[0], before[1], before[2]]);

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.equal(get(obj, 'length'), after.length, 'length');

    if (observer.isEnabled) {
      this.assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
      this.assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');

      this.assert.equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject');
      this.assert.equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject');
    }
  }

  '@test [{A},{B},{C}].removeObjects([{A},{B},{C}]) => [] + notify'() {
    let before = emberA(newObjectsFixture(3));
    let after = [];
    let obj = before;
    let observer = this.newObserver(obj, '[]', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); // Prime the cache

    obj.removeObjects(before);

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.equal(get(obj, 'length'), after.length, 'length');

    if (observer.isEnabled) {
      this.assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
      this.assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');

      this.assert.equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject');
      this.assert.equal(observer.validate('lastObject'), 1, 'should have notified lastObject');
    }
  }

  '@test [A,B,C].removeObjects([D]) => [A,B,C]'() {
    let before = emberA(newFixture(3));
    let after = before;
    let item = newFixture(1)[0];
    let obj = before;
    let observer = this.newObserver(obj, '[]', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); // Prime the cache

    obj.removeObjects([item]); // Note: item not in set

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.equal(get(obj, 'length'), after.length, 'length');

    if (observer.isEnabled) {
      this.assert.equal(observer.validate('[]'), false, 'should NOT have notified []');
      this.assert.equal(observer.validate('length'), false, 'should NOT have notified length');

      this.assert.equal(
        observer.validate('firstObject'),
        false,
        'should NOT have notified firstObject'
      );
      this.assert.equal(
        observer.validate('lastObject'),
        false,
        'should NOT have notified lastObject'
      );
    }
  }
}

runArrayTests('removeObjects', RemoveObjectsTests, 'MutableArray', 'NativeArray', 'ArrayProxy');
