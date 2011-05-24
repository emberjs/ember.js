// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// NOTE: A previous iteration differentiated between public and private props
// as well as methods vs props.  We are just keeping these for testing; the
// current impl doesn't care about the differences as much...

var PrivateProperty = SC.Mixin.create({
  _foo: '_FOO'
});

var PublicProperty = SC.Mixin.create({
  foo: 'FOO'
});

var PrivateMethod = SC.Mixin.create({
  _fooMethod: function() {}
});

var PublicMethod = SC.Mixin.create({
  fooMethod: function() {}
});

var BarProperties = SC.Mixin.create({
  _bar: '_BAR',
  bar: 'bar'
});

var BarMethods = SC.Mixin.create({
  _barMethod: function() {},
  barMethod: function() {}
});

var Combined = SC.Mixin.create(BarProperties, BarMethods);

var obj ;

module('Basic introspection', {
  setup: function() {
    obj = {};
    SC.mixin(obj, PrivateProperty, PublicProperty, PrivateMethod, PublicMethod, Combined);
  }
});

test('SC.mixins()', function() {
  
  function mapGuids(ary) { 
    return ary.map(function(x) { return SC.guidFor(x); }); 
  }
  
  same(mapGuids(SC.Mixin.mixins(obj)), mapGuids([PrivateProperty, PublicProperty, PrivateMethod, PublicMethod, Combined, BarProperties, BarMethods]), 'should return included mixins');
});
