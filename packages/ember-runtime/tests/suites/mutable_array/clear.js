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
  observer = this.newObserver(obj, '@each', 'length');

  equal(obj.clear(), obj, 'return self');

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  equal(observer.validate('@each'), false, 'should NOT have notified @each once');
  equal(observer.validate('length'), false, 'should NOT have notified length once');
});

suite.test("[X].clear() => [] + notify", function () {
  var obj, before, after, observer;

  before = this.newFixture(1);
  after  = [];
  obj = this.newObject(before);
  observer = this.newObserver(obj, '@each', 'length');

  equal(obj.clear(), obj, 'return self');

  deepEqual(this.toArray(obj), after, 'post item results');
  equal(Ember.get(obj, 'length'), after.length, 'length');

  equal(observer.timesCalled('@each'), 1, 'should have notified @each once');
  equal(observer.timesCalled('length'), 1, 'should have notified length once');

});
