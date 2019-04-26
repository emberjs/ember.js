import { ENV } from '@ember/-internals/environment';
import { Mixin, mixin, get, set } from '@ember/-internals/metal';
import EmberObject from '../../lib/system/object';
import Evented from '../../lib/mixins/evented';
import { moduleFor, AbstractTestCase, runLoopSettled } from 'internal-test-helpers';
import { FUNCTION_PROTOTYPE_EXTENSIONS } from '@ember/deprecated-features';

moduleFor(
  'Function.prototype.observes() helper',
  class extends AbstractTestCase {
    async ['@test global observer helper takes multiple params'](assert) {
      if (!FUNCTION_PROTOTYPE_EXTENSIONS || !ENV.EXTEND_PROTOTYPES.Function) {
        assert.ok(
          'undefined' === typeof Function.prototype.observes,
          'Function.prototype helper disabled'
        );
        return;
      }

      let MyMixin;
      expectDeprecation(() => {
        MyMixin = Mixin.create({
          count: 0,

          foo: function() {
            set(this, 'count', get(this, 'count') + 1);
          }.observes('bar', 'baz'),
        });
      }, /Function prototype extensions have been deprecated, please migrate from function\(\){}.observes\('foo'\) to observer\('foo', function\(\) {}\)/);

      let obj = mixin({}, MyMixin);
      assert.equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

      set(obj, 'bar', 'BAZ');
      await runLoopSettled();

      set(obj, 'baz', 'BAZ');
      await runLoopSettled();

      assert.equal(get(obj, 'count'), 2, 'should invoke observer after change');
    }
  }
);

moduleFor(
  'Function.prototype.on() helper',
  class extends AbstractTestCase {
    ['@test sets up an event listener, and can trigger the function on multiple events'](assert) {
      if (!FUNCTION_PROTOTYPE_EXTENSIONS || !ENV.EXTEND_PROTOTYPES.Function) {
        assert.ok(
          'undefined' === typeof Function.prototype.on,
          'Function.prototype helper disabled'
        );
        return;
      }

      let MyMixin;
      expectDeprecation(() => {
        MyMixin = Mixin.create({
          count: 0,

          foo: function() {
            set(this, 'count', get(this, 'count') + 1);
          }.on('bar', 'baz'),
        });
      }, /Function prototype extensions have been deprecated, please migrate from function\(\){}.on\('foo'\) to on\('foo', function\(\) {}\)/);

      let obj = mixin({}, Evented, MyMixin);
      assert.equal(get(obj, 'count'), 0, 'should not invoke listener immediately');

      obj.trigger('bar');
      obj.trigger('baz');
      assert.equal(get(obj, 'count'), 2, 'should invoke listeners when events trigger');
    }

    async ['@test can be chained with observes'](assert) {
      if (!FUNCTION_PROTOTYPE_EXTENSIONS || !ENV.EXTEND_PROTOTYPES.Function) {
        assert.ok('Function.prototype helper disabled');
        return;
      }

      let MyMixin;
      expectDeprecation(function() {
        MyMixin = Mixin.create({
          count: 0,
          bay: 'bay',
          foo: function() {
            set(this, 'count', get(this, 'count') + 1);
          }
            .observes('bay')
            .on('bar'),
        });
      });

      let obj = mixin({}, Evented, MyMixin);
      assert.equal(get(obj, 'count'), 0, 'should not invoke listener immediately');

      set(obj, 'bay', 'BAY');
      obj.trigger('bar');
      await runLoopSettled();

      assert.equal(get(obj, 'count'), 2, 'should invoke observer and listener');
    }
  }
);

moduleFor(
  'Function.prototype.property() helper',
  class extends AbstractTestCase {
    ['@test sets up a ComputedProperty'](assert) {
      if (!FUNCTION_PROTOTYPE_EXTENSIONS || !ENV.EXTEND_PROTOTYPES.Function) {
        assert.ok(
          'undefined' === typeof Function.prototype.property,
          'Function.prototype helper disabled'
        );
        return;
      }

      let MyClass;
      expectDeprecation(function() {
        MyClass = EmberObject.extend({
          firstName: null,
          lastName: null,
          fullName: function() {
            return get(this, 'firstName') + ' ' + get(this, 'lastName');
          }.property('firstName', 'lastName'),
        });
      }, /Function prototype extensions have been deprecated, please migrate from function\(\){}.property\('bar'\) to computed\('bar', function\(\) {}\)/);

      let obj = MyClass.create({ firstName: 'Fred', lastName: 'Flinstone' });
      assert.equal(get(obj, 'fullName'), 'Fred Flinstone', 'should return the computed value');

      set(obj, 'firstName', 'Wilma');
      assert.equal(get(obj, 'fullName'), 'Wilma Flinstone', 'should return the new computed value');

      set(obj, 'lastName', '');
      assert.equal(get(obj, 'fullName'), 'Wilma ', 'should return the new computed value');
    }
  }
);
