// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-runtime/~tests/suites/copyable');

var suite = SC.CopyableTests;

suite.module('copy');

suite.test("should return an equivalent copy", function() {
  var obj = this.newObject();
  var copy = obj.copy();
  ok(this.isEqual(obj, copy), 'old object and new object should be equivalent');
});


