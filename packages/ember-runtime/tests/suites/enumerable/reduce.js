// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/~tests/suites/enumerable');

var suite = Ember.EnumerableTests;

suite.module('reduce');

suite.test('collectes a summary value from an enumeration', function() {
  var obj = this.newObject([1, 2, 3]);
  var res = obj.reduce(function(previousValue, item, index, enumerable) { return previousValue + item }, 0)
  equals(res, 6)
});

suite.test('passes index of item to callback', function() {
  var obj = this.newObject([1, 2, 3]);
  var res = obj.reduce(function(previousValue, item, index, enumerable) { return previousValue + index }, 0)
  equals(res, 3)
});

suite.test('passes enumerable object to callback', function() {
  var obj = this.newObject([1, 2, 3]);
  var res = obj.reduce(function(previousValue, item, index, enumerable) { return enumerable }, 0)
  equals(res, obj)
});