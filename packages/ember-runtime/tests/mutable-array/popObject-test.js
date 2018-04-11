import { get } from 'ember-metal';
import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests, newFixture } from '../helpers/array';

class PopObjectTests extends AbstractTestCase {
  '@test [].popObject() => [] + returns undefined + NO notify'() {
    let obj = this.newObject([]);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    this.assert.equal(obj.popObject(), undefined, 'popObject results');

    this.assert.deepEqual(this.toArray(obj), [], 'post item results');

    this.assert.equal(observer.validate('[]'), false, 'should NOT have notified []');
    this.assert.equal(observer.validate('@each'), false, 'should NOT have notified @each');
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

  '@test [X].popObject() => [] + notify'() {
    let before = newFixture(1);
    let after = [];
    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    let ret = obj.popObject();

    this.assert.equal(ret, before[0], 'return object');
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

  '@test [A,B,C].popObject() => [A,B] + notify'() {
    let before = newFixture(3);
    let after = [before[0], before[1]];
    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    let ret = obj.popObject();

    this.assert.equal(ret, before[2], 'return object');
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
  }
}

runArrayTests('popObject', PopObjectTests, 'MutableArray', 'NativeArray', 'ArrayProxy');
