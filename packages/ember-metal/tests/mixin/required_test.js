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

test('applying a mixin to meet requirement', function() {
  FinalMixin.apply(obj);
  PartialMixin.apply(obj);
  equal(Ember.get(obj, 'foo'), 'FOO', 'should now be defined');
});

test('combined mixins to meet requirement', function() {
  Ember.Mixin.create(PartialMixin, FinalMixin).apply(obj);
  equal(Ember.get(obj, 'foo'), 'FOO', 'should now be defined');
});

test('merged mixin', function() {
  Ember.Mixin.create(PartialMixin, { foo: 'FOO' }).apply(obj);
  equal(Ember.get(obj, 'foo'), 'FOO', 'should now be defined');
});

test('define property on source object', function() {
  obj.foo = 'FOO';
  PartialMixin.apply(obj);
  equal(Ember.get(obj, 'foo'), 'FOO', 'should now be defined');
});

test('using apply', function() {
  Ember.mixin(obj, PartialMixin, { foo: 'FOO' });
  equal(Ember.get(obj, 'foo'), 'FOO', 'should now be defined');
});

