// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/~tests/suites/enumerable');

var suite = Ember.EnumerableTests;

suite.module('toArray');

suite.test('toArray should convert to an array', function() {
  var obj = this.newObject();
  same(obj.toArray(), this.toArray(obj));
});

