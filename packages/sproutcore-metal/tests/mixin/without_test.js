// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals setup */

test('without should create a new mixin excluding named properties', function() {

  var MixinA = Ember.Mixin.create({
    foo: 'FOO',
    bar: 'BAR'
  });
  
  var MixinB = MixinA.without('bar');
  
  var obj = {};
  MixinB.apply(obj);
  
  equals(obj.foo, 'FOO', 'should defined foo');
  equals(obj.bar, undefined, 'should not define bar');
  
});
