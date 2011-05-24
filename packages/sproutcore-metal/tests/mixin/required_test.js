// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals setup raises */

var PartialMixin, FinalMixin, obj;

module('Module.required', {
  setup: function() {
    PartialMixin = SC.Mixin.create({
      foo: SC.required(),
      bar: 'BAR'
    });
  
    FinalMixin = SC.Mixin.create({
      foo: 'FOO'
    });
  
    obj = {};
  },
  
  teardown: function() {
    PartialMixin = FinalMixin = obj = null;
  }
});

test('applying a mixin with unmet requirement', function() {
  raises(function() {
    PartialMixin.apply(obj);
  }, Error, 'should raise error for unmet requirement');
});

test('applying a mixin with unmet requirement using applyPartial', function() {
  PartialMixin.applyPartial(obj);
  equals(obj.foo, null, 'obj.foo has required');
  
  // applying regularly to object should throw
  raises(function() {
    SC.Mixin.create({ bar: 'BAR' }).apply(obj);
  }, Error, 'should raise error for unmet requirement');
  
});

test('applying a mixin to meet requirement', function() {
  FinalMixin.apply(obj);
  PartialMixin.apply(obj);
  equals(SC.get(obj, 'foo'), 'FOO', 'should now be defined');
});

test('combined mixins to meet requirement', function() {
  SC.Mixin.create(PartialMixin, FinalMixin).apply(obj);
  equals(SC.get(obj, 'foo'), 'FOO', 'should now be defined');
});

test('merged mixin', function() {
  SC.Mixin.create(PartialMixin, { foo: 'FOO' }).apply(obj);
});

test('define property on source object', function() {
  obj.foo = 'FOO';
  PartialMixin.apply(obj);
  equals(SC.get(obj, 'foo'), 'FOO', 'should now be defined');
});

test('using apply', function() {
  SC.mixin(obj, PartialMixin, { foo: 'FOO' });
  equals(SC.get(obj, 'foo'), 'FOO', 'should now be defined');
});

