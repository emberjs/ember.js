import { SuiteModuleBuilder } from '../suite';

const suite = SuiteModuleBuilder.create();

suite.module('replace');

suite.test('[].replace(0,0,\'X\') => [\'X\'] + notify', function() {
  let exp = this.newFixture(1);
  let obj = this.newObject([]);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.replace(0, 0, exp);

  deepEqual(this.toArray(obj), exp, 'post item results');

  equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');
  equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');
  equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');
});

suite.test('[].replace(0,0,"X") => ["X"] + avoid calling objectAt and notifying fistObject/lastObject when not in cache', function() {
  var obj, exp, observer;
  var called = 0;
  exp = this.newFixture(1);
  obj = this.newObject([]);
  obj.objectAt = function() {
    called++;
  };
  observer = this.newObserver(obj, 'firstObject', 'lastObject');

  obj.replace(0, 0, exp);

  equal(called, 0, 'should NOT have called objectAt upon replace when firstObject/lastObject are not cached');
  equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject since not cached');
  equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject since not cached');
});

suite.test('[A,B,C,D].replace(1,2,X) => [A,X,D] + notify', function() {
  let before  = this.newFixture(4);
  let replace = this.newFixture(1);
  let after   = [before[0], replace[0], before[3]];

  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.replace(1, 2, replace);

  deepEqual(this.toArray(obj), after, 'post item results');

  equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');

  equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject once');
  equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject once');
});

suite.test('[A,B,C,D].replace(1,2,[X,Y]) => [A,X,Y,D] + notify', function() {
  let before  = this.newFixture(4);
  let replace = this.newFixture(2);
  let after   = [before[0], replace[0], replace[1], before[3]];

  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.replace(1, 2, replace);

  deepEqual(this.toArray(obj), after, 'post item results');

  equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  equal(observer.validate('length'), false, 'should NOT have notified length');

  equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject once');
  equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject once');
});

suite.test('[A,B].replace(1,0,[X,Y]) => [A,X,Y,B] + notify', function() {
  let before  = this.newFixture(2);
  let replace = this.newFixture(2);
  let after   = [before[0], replace[0], replace[1], before[1]];

  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.replace(1, 0, replace);

  deepEqual(this.toArray(obj), after, 'post item results');

  equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');

  equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject once');
  equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject once');
});

suite.test('[A,B,C,D].replace(2,2) => [A,B] + notify', function() {
  let before  = this.newFixture(4);
  let after   = [before[0], before[1]];

  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.replace(2, 2);

  deepEqual(this.toArray(obj), after, 'post item results');

  equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');
  equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');

  equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject once');
});

suite.test('[A,B,C,D].replace(-1,1) => [A,B,C] + notify', function() {
  let before  = this.newFixture(4);
  let after   = [before[0], before[1], before[2]];

  let obj = this.newObject(before);
  let observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');

  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.replace(-1, 1);

  deepEqual(this.toArray(obj), after, 'post item results');

  equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  equal(observer.timesCalled('@each'), 0, 'should not have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');
  equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');

  equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject once');
});

suite.test('Adding object should notify enumerable observer', function() {
  let fixtures = this.newFixture(4);
  let obj = this.newObject(fixtures);
  let observer = this.newObserver(obj).observeEnumerable(obj);
  let item = this.newFixture(1)[0];

  obj.replace(2, 2, [item]);

  deepEqual(observer._before, [obj, [fixtures[2], fixtures[3]], 1], 'before');
  deepEqual(observer._after, [obj, 2, [item]], 'after');
});

suite.test('Adding object should notify array observer', function() {
  let fixtures = this.newFixture(4);
  let obj = this.newObject(fixtures);
  let observer = this.newObserver(obj).observeArray(obj);
  let item = this.newFixture(1)[0];

  obj.replace(2, 2, [item]);

  deepEqual(observer._before, [obj, 2, 2, 1], 'before');
  deepEqual(observer._after, [obj, 2, 2, 1], 'after');
});

export default suite;
