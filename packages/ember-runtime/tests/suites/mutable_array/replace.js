import { SuiteModuleBuilder } from '../suite';

const suite = SuiteModuleBuilder.create();

suite.module('replace');

suite.test('[].replace(0,0,\'X\') => [\'X\'] + notify', function(assert) {
  let exp = this.newFixture(1);
  let obj = this.newObject([]);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.replace(0, 0, exp);

  assert.deepEqual(this.toArray(obj), exp, 'post item results');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
  assert.equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');
  assert.equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');
});

suite.test('[].replace(0,0,"X") => ["X"] + avoid calling objectAt and notifying fistObject/lastObject when not in cache', function(assert) {
  var obj, exp, observer;
  var called = 0;
  exp = this.newFixture(1);
  obj = this.newObject([]);
  obj.objectAt = function() {
    called++;
  };
  observer = this.newObserver(obj, 'firstObject', 'lastObject');

  obj.replace(0, 0, exp);

  assert.equal(called, 0, 'should NOT have called objectAt upon replace when firstObject/lastObject are not cached');
  assert.equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject since not cached');
  assert.equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject since not cached');
});

suite.test('[A,B,C,D].replace(1,2,X) => [A,X,D] + notify', function(assert) {
  let before  = this.newFixture(4);
  let replace = this.newFixture(1);
  let after   = [before[0], replace[0], before[3]];

  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.replace(1, 2, replace);

  assert.deepEqual(this.toArray(obj), after, 'post item results');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');

  assert.equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject once');
  assert.equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject once');
});

suite.test('[A,B,C,D].replace(1,2,[X,Y]) => [A,X,Y,D] + notify', function(assert) {
  let before  = this.newFixture(4);
  let replace = this.newFixture(2);
  let after   = [before[0], replace[0], replace[1], before[3]];

  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.replace(1, 2, replace);

  assert.deepEqual(this.toArray(obj), after, 'post item results');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.validate('length'), false, 'should NOT have notified length');

  assert.equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject once');
  assert.equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject once');
});

suite.test('[A,B].replace(1,0,[X,Y]) => [A,X,Y,B] + notify', function(assert) {
  let before  = this.newFixture(2);
  let replace = this.newFixture(2);
  let after   = [before[0], replace[0], replace[1], before[1]];

  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.replace(1, 0, replace);

  assert.deepEqual(this.toArray(obj), after, 'post item results');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');

  assert.equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject once');
  assert.equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject once');
});

suite.test('[A,B,C,D].replace(2,2) => [A,B] + notify', function(assert) {
  let before  = this.newFixture(4);
  let after   = [before[0], before[1]];

  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.replace(2, 2);

  assert.deepEqual(this.toArray(obj), after, 'post item results');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
  assert.equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');

  assert.equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject once');
});

suite.test('[A,B,C,D].replace(-1,1) => [A,B,C] + notify', function(assert) {
  let before  = this.newFixture(4);
  let after   = [before[0], before[1], before[2]];

  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.replace(-1, 1);

  assert.deepEqual(this.toArray(obj), after, 'post item results');

  assert.equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  assert.equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  assert.equal(observer.timesCalled('length'), 1, 'should have notified length once');
  assert.equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');

  assert.equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject once');
});

suite.test('Adding object should notify array observer', function(assert) {
  let fixtures = this.newFixture(4);
  let obj = this.newObject(fixtures);
  let observer = this.newObserver(obj).observeArray(obj);
  let item = this.newFixture(1)[0];

  obj.replace(2, 2, [item]);

  assert.deepEqual(observer._before, [obj, 2, 2, 1], 'before');
  assert.deepEqual(observer._after, [obj, 2, 2, 1], 'after');
});

export default suite;
