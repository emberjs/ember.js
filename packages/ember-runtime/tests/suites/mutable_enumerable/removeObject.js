// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/~tests/suites/mutable_enumerable');

var suite = Ember.MutableEnumerableTests;

suite.module('removeObject');

suite.test("should return receiver", function() {
  var before, obj;
  before = this.newFixture(3);
  obj    = this.newObject(before);
  equals(obj.removeObject(before[1]), obj, 'shoudl return receiver');
});

suite.test("[A,B,C].removeObject(B) => [A,C] + notify", function() {
  var obj, before, after, observer, ret;
  
  before = this.newFixture(3);
  after  = [before[0], before[2]];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length');

  obj.removeObject(before[1]);

  same(this.toArray(obj), after, 'post item results');
  equals(Ember.get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equals(observer.validate('[]'), true, 'should NOT have notified []');
    equals(observer.validate('length'), true, 'should NOT have notified length');
  }
});

suite.test("[A,B,C].removeObject(D) => [A,B,C]", function() {
  var obj, before, after, observer, item;
  
  before = this.newFixture(3);
  after  = before;
  item   = this.newFixture(1)[0];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length');

  obj.removeObject(item); // note: item not in set

  same(this.toArray(obj), after, 'post item results');
  equals(Ember.get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equals(observer.validate('[]'), false, 'should NOT have notified []');
    equals(observer.validate('length'), false, 'should NOT have notified length');
  }
});

suite.test('Removing object should notify enumerable observer', function() {
  
  var fixtures = this.newFixture(3);
  var obj = this.newObject(fixtures);
  var observer = this.newObserver(obj).observeEnumerable(obj);
  var item = fixtures[1];
  
  obj.removeObject(item);
  
  same(observer._before, [obj, [item], null]);
  same(observer._after, [obj, [item], null]);
});
