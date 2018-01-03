import { SuiteModuleBuilder } from '../suite';
import { get } from 'ember-metal';
import { insertAt } from '../../../mixins/mutable_array';

const suite = SuiteModuleBuilder.create();

suite.module('insertAt');

suite.test('insertAt([], 0, X) => [X] + notify', function(assert) {
  let after = this.newFixture(1);
  let obj = this.newObject([]);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  insertAt(obj, 0, after[0]);

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');


  assert.equal(observer.timesCalledBefore('[]'), 1, 'should have notified [] will change once');
  assert.equal(observer.timesCalledBefore('@each'), 0, 'should not have notified @each will change once');
  assert.equal(observer.timesCalledBefore('length'), 1, 'should have notified length will change once');
  assert.equal(observer.timesCalledBefore('firstObject'), 1, 'should have notified firstObject will change once');
  assert.equal(observer.timesCalledBefore('lastObject'), 1, 'should have notified lastObject will change once');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] did change once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each did change once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length did change once');
  assert.equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject did change once');
  assert.equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject did change once');
});

suite.test('insertAt([], 200, X) => OUT_OF_RANGE_EXCEPTION exception', function(assert) {
  let obj = this.newObject([]);
  let that = this;

  assert.throws(() => obj.insertAt(200, that.newFixture(1)[0]), Error);
});

suite.test('insertAt([A], 0, X) => [X,A] + notify', function(assert) {
  let item = this.newFixture(1)[0];
  let before = this.newFixture(1);
  let after = [item, before[0]];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  insertAt(obj, 0, item);

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalledBefore('[]'), 1, 'should have notified [] will change once');
  assert.equal(observer.timesCalledBefore('@each'), 0, 'should not have notified @each will change once');
  assert.equal(observer.timesCalledBefore('length'), 1, 'should have notified length will change once');
  assert.equal(observer.timesCalledBefore('firstObject'), 1, 'should have notified firstObject will change once');
  assert.equal(observer.timesCalledBefore('lastObject'), 0, 'should NOT have notified lastObject will change once');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
  assert.equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');

  assert.equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject');
});

suite.test('insertAt([A], 1, X) => [A,X] + notify', function(assert) {
  let item = this.newFixture(1)[0];
  let before = this.newFixture(1);
  let after = [before[0], item];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  insertAt(obj, 1, item);

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalledBefore('[]'), 1, 'should have notified [] will change once');
  assert.equal(observer.timesCalledBefore('@each'), 0, 'should not have notified @each will change once');
  assert.equal(observer.timesCalledBefore('length'), 1, 'should have notified length will change once');
  assert.equal(observer.timesCalledBefore('firstObject'), 0, 'should NOT have notified firstObject will change once');
  assert.equal(observer.timesCalledBefore('lastObject'), 1, 'should have notified lastObject will change once');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
  assert.equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');

  assert.equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject');
});

suite.test('insertAt([A], 200, X) => OUT_OF_RANGE exception', function(assert) {
  let obj = this.newObject(this.newFixture(1));
  let that = this;

  assert.throws(() => obj.insertAt(200, that.newFixture(1)[0]), Error);
});

suite.test('insertAt([A,B,C], 0, X) => [X,A,B,C] + notify', function(assert) {
  let item = this.newFixture(1)[0];
  let before = this.newFixture(3);
  let after  = [item, before[0], before[1], before[2]];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  insertAt(obj, 0, item);

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalledBefore('[]'), 1, 'should have notified [] will change once');
  assert.equal(observer.timesCalledBefore('@each'), 0, 'should not have notified @each will change once');
  assert.equal(observer.timesCalledBefore('length'), 1, 'should have notified length will change once');
  assert.equal(observer.timesCalledBefore('firstObject'), 1, 'should have notified firstObject will change once');
  assert.equal(observer.timesCalledBefore('lastObject'), 0, 'should NOT have notified lastObject will change once');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
  assert.equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');

  assert.equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject');
});

suite.test('insertAt([A,B,C], 1, X) => [A,X,B,C] + notify', function(assert) {
  let item = this.newFixture(1)[0];
  let before = this.newFixture(3);
  let after  = [before[0], item, before[1], before[2]];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');
  let objectAtCalls = [];

  let objectAt = obj.objectAt;
  obj.objectAt = (ix) => {
    objectAtCalls.push(ix);
    return objectAt.call(obj, ix);
  };

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  objectAtCalls.splice(0, objectAtCalls.length);

  insertAt(obj, 1, item);
  assert.deepEqual(objectAtCalls, [], 'objectAt is not called when only inserting items');

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalledBefore('[]'), 1, 'should have notified [] will change once');
  assert.equal(observer.timesCalledBefore('@each'), 0, 'should not have notified @each will change once');
  assert.equal(observer.timesCalledBefore('length'), 1, 'should have notified length will change once');
  assert.equal(observer.timesCalledBefore('firstObject'), 0, 'should NOT have notified firstObject will change once');
  assert.equal(observer.timesCalledBefore('lastObject'), 0, 'should NOT have notified lastObject will change once');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');

  assert.equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject');
  assert.equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject');
});

suite.test('insertAt([A,B,C], 3, X) => [A,B,C,X] + notify', function(assert) {
  let item = this.newFixture(1)[0];
  let before = this.newFixture(3);
  let after  = [before[0], before[1], before[2], item];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  insertAt(obj, 3, item);

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalledBefore('[]'), 1, 'should have notified [] will change once');
  assert.equal(observer.timesCalledBefore('@each'), 0, 'should not have notified @each will change once');
  assert.equal(observer.timesCalledBefore('length'), 1, 'should have notified length will change once');
  assert.equal(observer.timesCalledBefore('firstObject'), 0, 'should NOT have notified firstObject will change once');
  assert.equal(observer.timesCalledBefore('lastObject'), 1, 'should have notified lastObject will change once');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
  assert.equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');

  assert.equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject');
});

suite.test('[A,B,C].insertAt(3, X) => [A,B,C,X] + notify', function(assert) {
  let item = this.newFixture(1)[0];
  let before = this.newFixture(3);
  let after  = [before[0], before[1], before[2], item];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.insertAt(3, item);

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalledBefore('[]'), 1, 'should have notified [] will change once');
  assert.equal(observer.timesCalledBefore('@each'), 0, 'should not have notified @each will change once');
  assert.equal(observer.timesCalledBefore('length'), 1, 'should have notified length will change once');
  assert.equal(observer.timesCalledBefore('firstObject'), 0, 'should NOT have notified firstObject will change once');
  assert.equal(observer.timesCalledBefore('lastObject'), 1, 'should have notified lastObject will change once');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
  assert.equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');

  assert.equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject');
});

export default suite;
