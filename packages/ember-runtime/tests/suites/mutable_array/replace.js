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
  observer = this.newObserver(obj, '[]', 'length');

  obj.replace(0,0,exp) ;
  
  same(this.toArray(obj), exp, 'post item results');

  if (observer.isEnabled) {
    equals(observer.validate('[]'), true, 'should have notified []');
    equals(observer.validate('length'), true, 'should have notified length');
  }
});

suite.test("[A,B,C,D].replace(1,2,X) => [A,X,D] + notify", function() {
  var obj, observer, before, replace, after;
  
  before  = this.newFixture(4);
  replace = this.newFixture(1);
  after   = [before[0], replace[0], before[3]];
  
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length');

  obj.replace(1,2,replace) ;

  same(this.toArray(obj), after, 'post item results');

  if (observer.isEnabled) {
    equals(observer.validate('[]'), true, 'should have notified []');
    equals(observer.validate('length'), true, 'should have notified length');
  }
});

suite.test("[A,B,C,D].replace(1,2,[X,Y]) => [A,X,Y,D] + notify", function() {
  var obj, observer, before, replace, after;
  
  before  = this.newFixture(4);
  replace = this.newFixture(2);
  after   = [before[0], replace[0], replace[1], before[3]];
  
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length');

  obj.replace(1,2,replace) ;

  same(this.toArray(obj), after, 'post item results');

  if (observer.isEnabled) {
    equals(observer.validate('[]'), true, 'should have notified []');
    equals(observer.validate('length'), true, 'should have notified length');
  }
});

suite.test("[A,B].replace(1,0,[X,Y]) => [A,X,Y,B] + notify", function() {
  var obj, observer, before, replace, after;
  
  before  = this.newFixture(2);
  replace = this.newFixture(2);
  after   = [before[0], replace[0], replace[1], before[1]];
  
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length');

  obj.replace(1,0,replace) ;

  same(this.toArray(obj), after, 'post item results');

  if (observer.isEnabled) {
    equals(observer.validate('[]'), true, 'should have notified []');
    equals(observer.validate('length'), true, 'should have notified length');
  }
});

suite.notest("[A,B,C,D].replace(2,2) => [A,B] + notify", function() {
  var obj, observer, before, replace, after;
  
  before  = this.newFixture(4);
  after   = [before[0], before[1]];
  
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length');

  obj.replace(2,2) ;

  same(this.toArray(obj), after, 'post item results');

  if (observer.isEnabled) {
    equals(observer.validate('[]'), true, 'should have notified []');
    equals(observer.validate('length'), true, 'should have notified length');
  }
});

suite.test('Adding object should notify enumerable observer', function() {

  var fixtures = this.newFixture(4);
  var obj = this.newObject(fixtures);
  var observer = this.newObserver(obj).observeEnumerable(obj);
  var item = this.newFixture(1)[0];
  
  obj.replace(2, 2, [item]);
  
  same(observer._before, [obj, [fixtures[2], fixtures[3]], 1], 'before');
  same(observer._after, [obj, 2, [item]], 'after');
});

suite.test('Adding object should notify array observer', function() {

  var fixtures = this.newFixture(4);
  var obj = this.newObject(fixtures);
  var observer = this.newObserver(obj).observeArray(obj);
  var item = this.newFixture(1)[0];
  
  obj.replace(2, 2, [item]);
  
  same(observer._before, [obj, 2, 2, 1], 'before');
  same(observer._after, [obj, 2, 2, 1], 'after');
});
