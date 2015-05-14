import {
  mixin,
  Mixin,
  required
} from 'ember-metal/mixin';
import { get } from 'ember-metal/property_get';

var PartialMixin, FinalMixin, obj;

QUnit.module('Module.required', {
  setup() {
    expectDeprecation(function() {
      PartialMixin = Mixin.create({
        foo: required(),
        bar: 'BAR'
      });
    }, "Ember.required is deprecated as its behavior is inconsistent and unreliable.");

    FinalMixin = Mixin.create({
      foo: 'FOO'
    });

    obj = {};
  },

  teardown() {
    PartialMixin = FinalMixin = obj = null;
  }
});

QUnit.test('applying a mixin to meet requirement', function() {
  FinalMixin.apply(obj);
  PartialMixin.apply(obj);
  equal(get(obj, 'foo'), 'FOO', 'should now be defined');
});

QUnit.test('combined mixins to meet requirement', function() {
  Mixin.create(PartialMixin, FinalMixin).apply(obj);
  equal(get(obj, 'foo'), 'FOO', 'should now be defined');
});

QUnit.test('merged mixin', function() {
  Mixin.create(PartialMixin, { foo: 'FOO' }).apply(obj);
  equal(get(obj, 'foo'), 'FOO', 'should now be defined');
});

QUnit.test('define property on source object', function() {
  obj.foo = 'FOO';
  PartialMixin.apply(obj);
  equal(get(obj, 'foo'), 'FOO', 'should now be defined');
});

QUnit.test('using apply', function() {
  mixin(obj, PartialMixin, { foo: 'FOO' });
  equal(get(obj, 'foo'), 'FOO', 'should now be defined');
});

