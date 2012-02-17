// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('Ember.Mixin#reopen');

test('using reopen() to add more properties to a simple', function() {
  var MixinA = Ember.Mixin.create({ foo: 'FOO', baz: 'BAZ' });
  MixinA.reopen({ bar: 'BAR', foo: 'FOO2' });
  var obj = {};
  MixinA.apply(obj);

  equal(Ember.get(obj, 'foo'), 'FOO2', 'mixin() should override');
  equal(Ember.get(obj, 'baz'), 'BAZ', 'preserve MixinA props');
  equal(Ember.get(obj, 'bar'), 'BAR', 'include MixinB props');
});

