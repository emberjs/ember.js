// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/~tests/suites/mutable_enumerable');

var suite = Ember.MutableEnumerableTests;

suite.module('addObject');

suite.test("should return receiver", function() {
  var before, obj;
  before = this.newFixture(3);
  obj    = this.newObject(before);
  equals(obj.addObject(before[1]), obj, 'should return receiver');
});

suite.test("[A,B].addObject(C) => [A,B, C] + notify", function() {
  var obj, before, after, observer, item, ret;
  
  before = this.newFixture(2);
  item   = this.newFixture(1)[0];
  after  = [before[0], before[1], item];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length');

  obj.addObject(item);

  same(this.toArray(obj), after, 'post item results');
  equals(Ember.get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equals(observer.validate('[]'), true, 'should NOT have notified []');
    equals(observer.validate('length'), true, 'should NOT have notified length');
  }
});

suite.test("[A,B,C].addObject(A) => [A,B,C] + NO notify", function() {
  var obj, before, after, observer, item;
  
  before = this.newFixture(3);
  after  = before;
  item   = before[0];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length');

  obj.addObject(item); // note: item in set

  same(this.toArray(obj), after, 'post item results');
  equals(Ember.get(obj, 'length'), after.length, 'length');
  
  if (observer.isEnabled) {
    equals(observer.validate('[]'), false, 'should NOT have notified []');
    equals(observer.validate('length'), false, 'should NOT have notified length');
  }
});

suite.test('Adding object should notify enumerable observer', function() {
  
  var obj = this.newObject(this.newFixture(3));
  var observer = this.newObserver(obj).observeEnumerable(obj);
  var item = this.newFixture(1)[0];
  
  obj.addObject(item);
  
  same(observer._before, [obj, null, [item]]);
  same(observer._after, [obj, null, [item]]);
});
