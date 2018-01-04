import { ENV } from 'ember-environment';
import { SuiteModuleBuilder } from '../suite';
import { get } from 'ember-metal';
import { removeAt } from '../../../mixins/mutable_array';

const suite = SuiteModuleBuilder.create();

suite.module('removeAt');

suite.test('removeAt([X], 0) => [] + notify', function(assert) {
  let before = this.newFixture(1);
  let after  = [];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  assert.equal(removeAt(obj, 0), obj, 'return self');

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
  assert.equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');
  assert.equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');
});

suite.test('removeAt([], 200) => OUT_OF_RANGE_EXCEPTION exception', function(assert) {
  let obj = this.newObject([]);
  assert.throws(() => removeAt(obj, 200), Error);
});

suite.test('removeAt([A,B], 0) => [B] + notify', function(assert) {
  let before = this.newFixture(2);
  let after  = [before[1]];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  assert.equal(removeAt(obj, 0), obj, 'return self');

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
  assert.equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');

  assert.equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject');
});

suite.test('removeAt([A,B], 1) => [A] + notify', function(assert) {
  let before = this.newFixture(2);
  let after  = [before[0]];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  assert.equal(removeAt(obj, 1), obj, 'return self');

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
  assert.equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');

  assert.equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject once');
});

suite.test('removeAt([A,B,C], 1) => [A,C] + notify', function(assert) {
  let before = this.newFixture(3);
  let after  = [before[0], before[2]];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  assert.equal(removeAt(obj, 1), obj, 'return self');

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');

  assert.equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject once');
  assert.equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject once');
});

suite.test('removeAt([A,B,C,D], 1,2) => [A,D] + notify', function(assert) {
  let before = this.newFixture(4);
  let after  = [before[0], before[3]];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  assert.equal(removeAt(obj, 1, 2), obj, 'return self');

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');

  assert.equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject once');
  assert.equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject once');
});

if (ENV.EXTEND_PROTOTYPES.Array) {
  suite.test('Array.prototype.removeAt is defined by default due to EXTEND_PROTOTYPES', function(assert) {
    assert.equal(typeof Array.prototype.removeAt, 'function', 'Array.prototype modified');
  });
}

suite.test('[A,B,C,D].removeAt(1,2) => [A,D] + notify', function(assert) {
  var obj, before, after, observer;

  before = this.newFixture(4);
  after  = [before[0], before[3]];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');
  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  assert.equal(obj.removeAt(1, 2), obj, 'return self');

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');

  assert.equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject once');
  assert.equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject once');
});

export default suite;
