import { get } from 'ember-metal';
import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests, newFixture } from '../helpers/array';

class AddObjectTest extends AbstractTestCase {
  '@test should return receiver'() {
    let before = newFixture(3);
    let obj    = this.newObject(before);
    this.assert.equal(obj.addObject(before[1]), obj, 'should return receiver');
  }

  '@test [A,B].addObject(C) => [A,B,C] + notify'() {
    let before = newFixture(2);
    let item   = newFixture(1)[0];
    let after  = [before[0], before[1], item];
    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    obj.addObject(item);

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.equal(get(obj, 'length'), after.length, 'length');

    if (observer.isEnabled) {
      this.assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
      this.assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
      this.assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
      this.assert.equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');

      this.assert.equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject once');
    }
  }

  '@test [A,B,C].addObject(A) => [A,B,C] + NO notify'() {
    let before = newFixture(3);
    let after  = before;
    let item   = before[0];
    let obj = this.newObject(before);
    let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

    obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

    obj.addObject(item); // note: item in set

    this.assert.deepEqual(this.toArray(obj), after, 'post item results');
    this.assert.equal(get(obj, 'length'), after.length, 'length');

    if (observer.isEnabled) {
      this.assert.equal(observer.validate('[]'), false, 'should NOT have notified []');
      this.assert.equal(observer.validate('@each'), false, 'should NOT have notified @each');
      this.assert.equal(observer.validate('length'), false, 'should NOT have notified length');
      this.assert.equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject once');
      this.assert.equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject once');
    }
  }
}

runArrayTests('addObject', AddObjectTest, 'MutableArray', 'NativeArray', 'ArrayProxy');
