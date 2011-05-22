// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('SC.defineProperty');

test('toString', function() {

  var obj = {};
  SC.defineProperty(obj, 'toString', SC.SIMPLE_PROPERTY, function() { return 'FOO'; });
  equals(obj.toString(), 'FOO', 'should replace toString');
});
