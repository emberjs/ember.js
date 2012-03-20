// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals raises */

require('ember-runtime/~tests/suites/mutable_array');

var suite = Ember.MutableArrayTests;

suite.module('clear');

suite.test("[].clear() => [] + notify", function () {
  var obj, before, after, observer;

  before = [];
  after  = [];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length');

  equal(obj.clear(), obj, 'return self');

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equal(observer.validate('[]'), true, 'should have notified []');
    equal(observer.validate('length'), true, 'should have notified length');
  }
});

suite.test("[X].clear() => [] + notify", function () {
  var obj, before, after, observer;

  before = this.newFixture(1);
  after  = [];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '[]', 'length');

  equal(obj.clear(), obj, 'return self');

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  if (observer.isEnabled) {
    equal(observer.validate('[]'), true, 'should have notified []');
    equal(observer.validate('length'), true, 'should have notified length');
  }

});
