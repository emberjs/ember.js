// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals setup raises */

var PartialMixin, FinalMixin, obj;

module('Module.required', {
  setup: function() {
    PartialMixin = Ember.Mixin.create({
      foo: Ember.required(),
      bar: 'BAR'
    });
  
    FinalMixin = Ember.Mixin.create({
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
    Ember.Mixin.create({ bar: 'BAR' }).apply(obj);
  }, Error, 'should raise error for unmet requirement');
  
});

test('applying a mixin to meet requirement', function() {
  FinalMixin.apply(obj);
  PartialMixin.apply(obj);
  equals(Ember.get(obj, 'foo'), 'FOO', 'should now be defined');
});

test('combined mixins to meet requirement', function() {
  Ember.Mixin.create(PartialMixin, FinalMixin).apply(obj);
  equals(Ember.get(obj, 'foo'), 'FOO', 'should now be defined');
});

test('merged mixin', function() {
  Ember.Mixin.create(PartialMixin, { foo: 'FOO' }).apply(obj);
});

test('define property on source object', function() {
  obj.foo = 'FOO';
  PartialMixin.apply(obj);
  equals(Ember.get(obj, 'foo'), 'FOO', 'should now be defined');
});

test('using apply', function() {
  Ember.mixin(obj, PartialMixin, { foo: 'FOO' });
  equals(Ember.get(obj, 'foo'), 'FOO', 'should now be defined');
});

