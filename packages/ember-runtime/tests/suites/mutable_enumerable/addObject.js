import { SuiteModuleBuilder } from '../suite';
import { get } from 'ember-metal';

const suite = SuiteModuleBuilder.create();

suite.module('addObject');

suite.test('should return receiver', function(assert) {
  let before = this.newFixture(3);
  let obj = this.newObject(before);

  assert.equal(obj.addObject(before[1]), obj, 'should return receiver');
});

suite.test('[A,B].addObject(C) => [A,B,C] + notify', function(assert) {
  let before = this.newFixture(2);
  let item = this.newFixture(1)[0];
  let after = [before[0], before[1], item];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', 'length', 'firstObject', 'lastObject');

  get(obj, 'firstObject');
  get(obj, 'lastObject');

  obj.addObject(item);

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
    assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
    assert.equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');
    // This gets called since MutableEnumerable is naive about changes
    assert.equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');
  }
});

suite.test('[A,B,C].addObject(A) => [A,B,C] + NO notify', function(assert) {
  let before = this.newFixture(3);
  let after = before;
  let item = before[0];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', 'length', 'firstObject', 'lastObject');

  obj.addObject(item); // note: item in set

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    assert.equal(observer.validate('[]'), false, 'should NOT have notified []');
    assert.equal(observer.validate('length'), false, 'should NOT have notified length');
    assert.equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject');
    assert.equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject');
  }
});

export default suite;
