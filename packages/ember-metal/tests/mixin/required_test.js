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
  }

  afterEach() {
    PartialMixin = FinalMixin = obj = null;
    ENV._ENABLE_PROPERTY_REQUIRED_SUPPORT = originalEnvVal;
  }

  ['@test applying a mixin to meet requirement'](assert) {
    FinalMixin.apply(obj);
    PartialMixin.apply(obj);
    assert.equal(get(obj, 'foo'), 'FOO', 'should now be defined');
  }

  ['@test combined mixins to meet requirement'](assert) {
    Mixin.create(PartialMixin, FinalMixin).apply(obj);
    assert.equal(get(obj, 'foo'), 'FOO', 'should now be defined');
  }

  ['@test merged mixin'](assert) {
    Mixin.create(PartialMixin, { foo: 'FOO' }).apply(obj);
    assert.equal(get(obj, 'foo'), 'FOO', 'should now be defined');
  }

  ['@test define property on source object'](assert) {
    obj.foo = 'FOO';
    PartialMixin.apply(obj);
    assert.equal(get(obj, 'foo'), 'FOO', 'should now be defined');
  }

  ['@test using apply'](assert) {
    mixin(obj, PartialMixin, { foo: 'FOO' });
    assert.equal(get(obj, 'foo'), 'FOO', 'should now be defined');
  }
});
