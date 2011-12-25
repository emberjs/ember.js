// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/~tests/suites/enumerable');

var suite = Ember.EnumerableTests;

suite.module('compact');

suite.test('removes null values from enumerable', function() {
  var obj = this.newObject([null, 1, null]);
  var ary = obj.compact()
  equals(ary[0], 1)
  equals(ary.length, 1)
});