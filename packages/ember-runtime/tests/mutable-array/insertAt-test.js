import { get } from 'ember-metal';
import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests, newFixture } from '../helpers/array';

class InsertAtTests extends AbstractTestCase {
  '@test [].insertAt(0, X) => [X] + notify'() {
    let after = newFixture(1);
    let obj = this.newObject([]);
    let observer = this.newObserver(
      obj,
      '[]',
      '@each',
      'length',
      'firstObject',
      'lastObject'
    );

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    obj.insertAt(0, after[0]);

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.equal(get(obj, 'length'), after.length, 'length');

    this.assert.equal(
      observer.timesCalled('[]'),
      1,
      'should have notified [] did change once'
    );
    this.assert.equal(
      observer.timesCalled('@each'),
      0,
      'should not have notified @each did change once'
    );
    this.assert.equal(
      observer.timesCalled('length'),
      1,
      'should have notified length did change once'
    );
    this.assert.equal(
      observer.timesCalled('firstObject'),
      1,
      'should have notified firstObject did change once'
    );
    this.assert.equal(
      observer.timesCalled('lastObject'),
      1,
      'should have notified lastObject did change once'
    );
  }

  '@test [].insertAt(200,X) => OUT_OF_RANGE_EXCEPTION exception'() {
    let obj = this.newObject([]);
    let that = this;

    this.assert.throws(() => obj.insertAt(200, that.newFixture(1)[0]), Error);
  }

  '@test [A].insertAt(0, X) => [X,A] + notify'() {
    let item = newFixture(1)[0];
    let before = newFixture(1);
    let after = [item, before[0]];
    let obj = this.newObject(before);
    let observer = this.newObserver(
      obj,
      '[]',
      '@each',
      'length',
      'firstObject',
      'lastObject'
    );

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    obj.insertAt(0, item);

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.equal(get(obj, 'length'), after.length, 'length');

    this.assert.equal(
      observer.timesCalled('[]'),
      1,
      'should have notified [] once'
    );
    this.assert.equal(
      observer.timesCalled('@each'),
      0,
      'should not have notified @each once'
    );
    this.assert.equal(
      observer.timesCalled('length'),
      1,
      'should have notified length once'
    );
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

  '@test [A].insertAt(1, X) => [A,X] + notify'() {
    let item = newFixture(1)[0];
    let before = newFixture(1);
    let after = [before[0], item];
    let obj = this.newObject(before);
    let observer = this.newObserver(
      obj,
      '[]',
      '@each',
      'length',
      'firstObject',
      'lastObject'
    );

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    obj.insertAt(1, item);

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.equal(get(obj, 'length'), after.length, 'length');

    this.assert.equal(
      observer.timesCalled('[]'),
      1,
      'should have notified [] once'
    );
    this.assert.equal(
      observer.timesCalled('@each'),
      0,
      'should not have notified @each once'
    );
    this.assert.equal(
      observer.timesCalled('length'),
      1,
      'should have notified length once'
    );
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
  }

  '@test [A].insertAt(200,X) => OUT_OF_RANGE exception'() {
    let obj = this.newObject(newFixture(1));
    let that = this;

    this.assert.throws(() => obj.insertAt(200, that.newFixture(1)[0]), Error);
  }

  '@test [A,B,C].insertAt(0,X) => [X,A,B,C] + notify'() {
    let item = newFixture(1)[0];
    let before = newFixture(3);
    let after = [item, before[0], before[1], before[2]];
    let obj = this.newObject(before);
    let observer = this.newObserver(
      obj,
      '[]',
      '@each',
      'length',
      'firstObject',
      'lastObject'
    );

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    obj.insertAt(0, item);

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.equal(get(obj, 'length'), after.length, 'length');

    this.assert.equal(
      observer.timesCalled('[]'),
      1,
      'should have notified [] once'
    );
    this.assert.equal(
      observer.timesCalled('@each'),
      0,
      'should not have notified @each once'
    );
    this.assert.equal(
      observer.timesCalled('length'),
      1,
      'should have notified length once'
    );
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

  '@test [A,B,C].insertAt(1,X) => [A,X,B,C] + notify'() {
    let item = newFixture(1)[0];
    let before = newFixture(3);
    let after = [before[0], item, before[1], before[2]];
    let obj = this.newObject(before);
    let observer = this.newObserver(
      obj,
      '[]',
      '@each',
      'length',
      'firstObject',
      'lastObject'
    );
    let objectAtCalls = [];

    let objectAt = obj.objectAt;
    obj.objectAt = ix => {
      objectAtCalls.push(ix);
      return objectAt.call(obj, ix);
    };

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    objectAtCalls.splice(0, objectAtCalls.length);

    obj.insertAt(1, item);
    this.assert.deepEqual(
      objectAtCalls,
      [],
      'objectAt is not called when only inserting items'
    );

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.equal(get(obj, 'length'), after.length, 'length');

    this.assert.equal(
      observer.timesCalled('[]'),
      1,
      'should have notified [] once'
    );
    this.assert.equal(
      observer.timesCalled('@each'),
      0,
      'should not have notified @each once'
    );
    this.assert.equal(
      observer.timesCalled('length'),
      1,
      'should have notified length once'
    );

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

  '@test [A,B,C].insertAt(3,X) => [A,B,C,X] + notify'() {
    let item = newFixture(1)[0];
    let before = newFixture(3);
    let after = [before[0], before[1], before[2], item];
    let obj = this.newObject(before);
    let observer = this.newObserver(
      obj,
      '[]',
      '@each',
      'length',
      'firstObject',
      'lastObject'
    );

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    obj.insertAt(3, item);

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.equal(get(obj, 'length'), after.length, 'length');

    this.assert.equal(
      observer.timesCalled('[]'),
      1,
      'should have notified [] once'
    );
    this.assert.equal(
      observer.timesCalled('@each'),
      0,
      'should not have notified @each once'
    );
    this.assert.equal(
      observer.timesCalled('length'),
      1,
      'should have notified length once'
    );
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
  }
}

runArrayTests(
  'instertAt',
  InsertAtTests,
  'MutableArray',
  'NativeArray',
  'ArrayProxy'
);
