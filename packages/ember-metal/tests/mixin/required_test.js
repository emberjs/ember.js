import {
  mixin,
  Mixin,
  required,
  get
} from '../..';
import { ENV } from 'ember-environment';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

let PartialMixin, FinalMixin, obj;
let originalEnvVal;

moduleFor('Module.required', class extends AbstractTestCase {
  beforeEach() {
    originalEnvVal = ENV._ENABLE_PROPERTY_REQUIRED_SUPPORT;
    ENV._ENABLE_PROPERTY_REQUIRED_SUPPORT = true;

    FinalMixin = Mixin.create({
      foo: 'FOO'
    });

    obj = {};
  }

  afterEach() {
    PartialMixin = FinalMixin = obj = null;
    ENV._ENABLE_PROPERTY_REQUIRED_SUPPORT = originalEnvVal;
  }

  ['@test applying a mixin to meet requirement'](assert) {
    assert.expectDeprecation(() => {
      PartialMixin = Mixin.create({
        foo: required(),
        bar: 'BAR'
      });
    }, 'Ember.required is deprecated as its behavior is inconsistent and unreliable.');

    FinalMixin.apply(obj);
    PartialMixin.apply(obj);
    assert.equal(get(obj, 'foo'), 'FOO', 'should now be defined');
  }

  ['@test combined mixins to meet requirement'](assert) {
    assert.expectDeprecation(() => {
      PartialMixin = Mixin.create({
        foo: required(),
        bar: 'BAR'
      });
    }, 'Ember.required is deprecated as its behavior is inconsistent and unreliable.');
    Mixin.create(PartialMixin, FinalMixin).apply(obj);
    assert.equal(get(obj, 'foo'), 'FOO', 'should now be defined');
  }

  ['@test merged mixin'](assert) {
    assert.expectDeprecation(() => {
      PartialMixin = Mixin.create({
        foo: required(),
        bar: 'BAR'
      });
    }, 'Ember.required is deprecated as its behavior is inconsistent and unreliable.');
    Mixin.create(PartialMixin, { foo: 'FOO' }).apply(obj);
    assert.equal(get(obj, 'foo'), 'FOO', 'should now be defined');
  }

  ['@test define property on source object'](assert) {
    assert.expectDeprecation(() => {
      PartialMixin = Mixin.create({
        foo: required(),
        bar: 'BAR'
      });
    }, 'Ember.required is deprecated as its behavior is inconsistent and unreliable.');
    obj.foo = 'FOO';
    PartialMixin.apply(obj);
    assert.equal(get(obj, 'foo'), 'FOO', 'should now be defined');
  }

  ['@test using apply'](assert) {
    assert.expectDeprecation(() => {
      PartialMixin = Mixin.create({
        foo: required(),
        bar: 'BAR'
      });
    }, 'Ember.required is deprecated as its behavior is inconsistent and unreliable.');
    mixin(obj, PartialMixin, { foo: 'FOO' });
    assert.equal(get(obj, 'foo'), 'FOO', 'should now be defined');
  }
});
