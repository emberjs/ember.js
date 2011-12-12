// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('Ember.defineProperty');

test('toString', function() {

  var obj = {};
  Ember.defineProperty(obj, 'toString', Ember.SIMPLE_PROPERTY, function() { return 'FOO'; });
  equals(obj.toString(), 'FOO', 'should replace toString');
});
