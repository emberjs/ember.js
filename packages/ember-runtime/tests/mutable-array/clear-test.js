import { get } from 'ember-metal';
import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests, newFixture } from '../helpers/array';

class ClearTests extends AbstractTestCase {
  '@test [].clear() => [] + notify'() {
    let before = [];
    let after = [];
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

    this.assert.equal(obj.clear(), obj, 'return self');

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.equal(get(obj, 'length'), after.length, 'length');

    this.assert.equal(
      observer.validate('[]'),
      false,
      'should NOT have notified [] once'
    );
    this.assert.equal(
      observer.validate('@each'),
      false,
      'should NOT have notified @each once'
    );
    this.assert.equal(
      observer.validate('length'),
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
  }

  '@test [X].clear() => [] + notify'() {
    var obj, before, after, observer;

    before = newFixture(1);
    after = [];
    obj = this.newObject(before);
    observer = this.newObserver(
      obj,
      '[]',
      '@each',
      'length',
      'firstObject',
      'lastObject'
    );
    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    this.assert.equal(obj.clear(), obj, 'return self');

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
      observer.timesCalled('lastObject'),
      1,
      'should have notified lastObject once'
    );
  }
}

runArrayTests('clear', ClearTests, 'MutableArray', 'NativeArray', 'ArrayProxy');
