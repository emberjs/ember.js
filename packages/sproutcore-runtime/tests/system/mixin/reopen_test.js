// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('SC.Mixin#reopen');

test('using reopen() to add more properties to a simple', function() {
  var MixinA = SC.Mixin.create({ foo: 'FOO', baz: 'BAZ' });
  MixinA.reopen({ bar: 'BAR', foo: 'FOO2' });
  var obj = {};
  MixinA.apply(obj);
  
  equals(SC.get(obj, 'foo'), 'FOO2', 'mixin() should override');
  equals(SC.get(obj, 'baz'), 'BAZ', 'preserve MixinA props');
  equals(SC.get(obj, 'bar'), 'BAR', 'include MixinB props');
});

