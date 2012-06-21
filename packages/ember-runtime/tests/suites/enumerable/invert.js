// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/~tests/suites/enumerable');

var suite = Ember.EnumerableTests;

suite.module('invert');

suite.test('should return new instance with elements in inverted order', function () {
  var before, after, obj, ret;

  before = this.newFixture(3);
  after  = [before[2], before[1], before[0]];
  obj = this.newObject(before);

  ret = obj.invert();

  deepEqual(this.toArray(ret), after, 'should have been inverted');
  deepEqual(this.toArray(obj), before, 'should not have changed original');
});
