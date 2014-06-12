/*globals setup raises */
import {
  mixin,
  Mixin,
  required
} from 'ember-metal/mixin';
import { get } from 'ember-metal/property_get';

var PartialMixin, FinalMixin, obj;

QUnit.module('Module.required', {
  setup: function() {
    PartialMixin = Mixin.create({
      foo: required(),
      bar: 'BAR'
    });

    FinalMixin = Mixin.create({
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
  equal(get(obj, 'foo'), 'FOO', 'should now be defined');
});

test('combined mixins to meet requirement', function() {
  Mixin.create(PartialMixin, FinalMixin).apply(obj);
  equal(get(obj, 'foo'), 'FOO', 'should now be defined');
});

test('merged mixin', function() {
  Mixin.create(PartialMixin, { foo: 'FOO' }).apply(obj);
  equal(get(obj, 'foo'), 'FOO', 'should now be defined');
});

test('define property on source object', function() {
  obj.foo = 'FOO';
  PartialMixin.apply(obj);
  equal(get(obj, 'foo'), 'FOO', 'should now be defined');
});

test('using apply', function() {
  mixin(obj, PartialMixin, { foo: 'FOO' });
  equal(get(obj, 'foo'), 'FOO', 'should now be defined');
});

