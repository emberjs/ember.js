// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// NOTE: A previous iteration differentiated between public and private props
// as well as methods vs props.  We are just keeping these for testing; the
// current impl doesn't care about the differences as much...

var PrivateProperty = Ember.Mixin.create({
  _foo: '_FOO'
});

var PublicProperty = Ember.Mixin.create({
  foo: 'FOO'
});

var PrivateMethod = Ember.Mixin.create({
  _fooMethod: function() {}
});

var PublicMethod = Ember.Mixin.create({
  fooMethod: function() {}
});

var BarProperties = Ember.Mixin.create({
  _bar: '_BAR',
  bar: 'bar'
});

var BarMethods = Ember.Mixin.create({
  _barMethod: function() {},
  barMethod: function() {}
});

var Combined = Ember.Mixin.create(BarProperties, BarMethods);

var obj ;

module('Basic introspection', {
  setup: function() {
    obj = {};
    Ember.mixin(obj, PrivateProperty, PublicProperty, PrivateMethod, PublicMethod, Combined);
  }
});

test('Ember.mixins()', function() {
  
  function mapGuids(ary) { 
    return ary.map(function(x) { return Ember.guidFor(x); }); 
  }
  
  same(mapGuids(Ember.Mixin.mixins(obj)), mapGuids([PrivateProperty, PublicProperty, PrivateMethod, PublicMethod, Combined, BarProperties, BarMethods]), 'should return included mixins');
});
