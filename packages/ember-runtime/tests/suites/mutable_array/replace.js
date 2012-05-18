// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/~tests/suites/mutable_array');

var suite = Ember.MutableArrayTests;

suite.module('replace');

suite.test("[].replace(0,0,'X') => ['X'] + notify", function() {

  var obj, exp, observer;
  exp = this.newFixture(1);
  obj = this.newObject([]);
  observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');
  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.replace(0,0,exp) ;

  deepEqual(this.toArray(obj), exp, 'post item results');

  equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  equal(observer.timesCalled('@each'), 1, 'should have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');
  equal(observer.timesCalled('firstObject'), 1, 'should have notified firstObject once');
  equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');
});

suite.test("[A,B,C,D].replace(1,2,X) => [A,X,D] + notify", function() {
  var obj, observer, before, replace, after;

  before  = this.newFixture(4);
  replace = this.newFixture(1);
  after   = [before[0], replace[0], before[3]];

  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');
  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.replace(1,2,replace) ;

  deepEqual(this.toArray(obj), after, 'post item results');

  equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  equal(observer.timesCalled('@each'), 1, 'should have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');

  equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject once');
  equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject once');
});

suite.test("[A,B,C,D].replace(1,2,[X,Y]) => [A,X,Y,D] + notify", function() {
  var obj, observer, before, replace, after;

  before  = this.newFixture(4);
  replace = this.newFixture(2);
  after   = [before[0], replace[0], replace[1], before[3]];

  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');
  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.replace(1,2,replace) ;

  deepEqual(this.toArray(obj), after, 'post item results');

  equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  equal(observer.timesCalled('@each'), 1, 'should have notified @each once');
  equal(observer.validate('length'), false, 'should NOT have notified length');

  equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject once');
  equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject once');
});

suite.test("[A,B].replace(1,0,[X,Y]) => [A,X,Y,B] + notify", function() {
  var obj, observer, before, replace, after;

  before  = this.newFixture(2);
  replace = this.newFixture(2);
  after   = [before[0], replace[0], replace[1], before[1]];

  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');
  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.replace(1,0,replace) ;

  deepEqual(this.toArray(obj), after, 'post item results');

  equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  equal(observer.timesCalled('@each'), 1, 'should have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');

  equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject once');
  equal(observer.validate('lastObject'), false, 'should NOT have notified lastObject once');
});

suite.test("[A,B,C,D].replace(2,2) => [A,B] + notify", function() {
  var obj, observer, before, replace, after;

  before  = this.newFixture(4);
  after   = [before[0], before[1]];

  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', '@each', 'length', 'firstObject', 'lastObject');
  obj.getProperties('firstObject', 'lastObject'); /* Prime the cache */

  obj.replace(2,2);

  deepEqual(this.toArray(obj), after, 'post item results');

  equal(observer.timesCalled('[]'), 1, 'should have notified [] once');
  equal(observer.timesCalled('@each'), 1, 'should have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');
  equal(observer.timesCalled('lastObject'), 1, 'should have notified lastObject once');

  equal(observer.validate('firstObject'), false, 'should NOT have notified firstObject once');
});

suite.test('Adding object should notify enumerable observer', function() {

  var fixtures = this.newFixture(4);
  var obj = this.newObject(fixtures);
  var observer = this.newObserver(obj).observeEnumerable(obj);
  var item = this.newFixture(1)[0];

  obj.replace(2, 2, [item]);

  deepEqual(observer._before, [obj, [fixtures[2], fixtures[3]], 1], 'before');
  deepEqual(observer._after, [obj, 2, [item]], 'after');
});

suite.test('Adding object should notify array observer', function() {

  var fixtures = this.newFixture(4);
  var obj = this.newObject(fixtures);
  var observer = this.newObserver(obj).observeArray(obj);
  var item = this.newFixture(1)[0];

  obj.replace(2, 2, [item]);

  deepEqual(observer._before, [obj, 2, 2, 1], 'before');
  deepEqual(observer._after, [obj, 2, 2, 1], 'after');
});
