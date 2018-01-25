import { SuiteModuleBuilder } from '../suite';
import { get } from 'ember-metal';

const suite = SuiteModuleBuilder.create();

suite.module('insertAt');

suite.test('[].insertAt(0, X) => [X] + notify', function(assert) {
  let after = this.newFixture(1);
  let obj = this.newObject([]);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.insertAt(0, after[0]);

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] did change once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each did change once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length did change once');
  assert.equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject did change once');
  assert.equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject did change once');
});

suite.test('[].insertAt(200,X) => OUT_OF_RANGE_EXCEPTION exception', function(assert) {
  let obj = this.newObject([]);
  let that = this;

  assert.throws(() => obj.insertAt(200, that.newFixture(1)[0]), Error);
});

suite.test('[A].insertAt(0, X) => [X,A] + notify', function(assert) {
  let item = this.newFixture(1)[0];
  let before = this.newFixture(1);
  let after = [item, before[0]];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.insertAt(0, item);

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
  assert.equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');

  assert.equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject');
});

suite.test('[A].insertAt(1, X) => [A,X] + notify', function(assert) {
  let item = this.newFixture(1)[0];
  let before = this.newFixture(1);
  let after = [before[0], item];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.insertAt(1, item);

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
  assert.equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');

  assert.equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject');
});

suite.test('[A].insertAt(200,X) => OUT_OF_RANGE exception', function(assert) {
  let obj = this.newObject(this.newFixture(1));
  let that = this;

  assert.throws(() => obj.insertAt(200, that.newFixture(1)[0]), Error);
});

suite.test('[A,B,C].insertAt(0,X) => [X,A,B,C] + notify', function(assert) {
  let item = this.newFixture(1)[0];
  let before = this.newFixture(3);
  let after  = [item, before[0], before[1], before[2]];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.insertAt(0, item);

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
  assert.equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');

  assert.equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject');
});

suite.test('[A,B,C].insertAt(1,X) => [A,X,B,C] + notify', function(assert) {
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

  obj.insertAt(1, item);
  assert.deepEqual(objectAtCalls, [], 'objectAt is not called when only inserting items');

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');

  assert.equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject');
  assert.equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject');
});

suite.test('[A,B,C].insertAt(3,X) => [A,B,C,X] + notify', function(assert) {
  let item = this.newFixture(1)[0];
  let before = this.newFixture(3);
  let after  = [before[0], before[1], before[2], item];
  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.insertAt(3, item);

  assert.deepEqual(this.toArray(obj), after, 'post item results');
  assert.equal(get(obj, 'length'), after.length, 'length');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
  assert.equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');

  assert.equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject');
});

export default suite;
