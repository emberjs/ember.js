import {
  mixin,
  Mixin,
  required,
  get
} from '../..';
import { ENV } from 'ember-environment';

let PartialMixin, FinalMixin, obj;
let originalEnvVal;
QUnit.module('Module.required', {
  beforeEach() {
    originalEnvVal = ENV._ENABLE_PROPERTY_REQUIRED_SUPPORT;
    ENV._ENABLE_PROPERTY_REQUIRED_SUPPORT = true;
    expectDeprecation(() => {
      PartialMixin = Mixin.create({
        foo: required(),
        bar: 'BAR'
      });
    }, 'Ember.required is deprecated as its behavior is inconsistent and unreliable.');

    FinalMixin = Mixin.create({
      foo: 'FOO'
    });

    obj = {};
  },

  afterEach() {
    PartialMixin = FinalMixin = obj = null;
    ENV._ENABLE_PROPERTY_REQUIRED_SUPPORT = originalEnvVal;
  }
});

QUnit.test('applying a mixin to meet requirement', function(assert) {
  FinalMixin.apply(obj);
  PartialMixin.apply(obj);
  assert.equal(get(obj, 'foo'), 'FOO', 'should now be defined');
});

QUnit.test('combined mixins to meet requirement', function(assert) {
  Mixin.create(PartialMixin, FinalMixin).apply(obj);
  assert.equal(get(obj, 'foo'), 'FOO', 'should now be defined');
});

QUnit.test('merged mixin', function(assert) {
  Mixin.create(PartialMixin, { foo: 'FOO' }).apply(obj);
  assert.equal(get(obj, 'foo'), 'FOO', 'should now be defined');
});

QUnit.test('define property on source object', function(assert) {
  obj.foo = 'FOO';
  PartialMixin.apply(obj);
  assert.equal(get(obj, 'foo'), 'FOO', 'should now be defined');
});

QUnit.test('using apply', function(assert) {
  mixin(obj, PartialMixin, { foo: 'FOO' });
  assert.equal(get(obj, 'foo'), 'FOO', 'should now be defined');
});
