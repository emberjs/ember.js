import { ENV } from '@ember/-internals/environment';
import { Mixin, mixin, get, set } from '@ember/-internals/metal';
import EmberObject from '../../lib/system/object';
import Evented from '../../lib/mixins/evented';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Function.prototype.observes() helper',
  class extends AbstractTestCase {
    ['@test global observer helper takes multiple params'](assert) {
      if (!ENV.EXTEND_PROTOTYPES.Function) {
        assert.ok(
          'undefined' === typeof Function.prototype.observes,
          'Function.prototype helper disabled'
        );
        return;
      }

      let MyMixin = Mixin.create({
        count: 0,

        foo: function() {
          set(this, 'count', get(this, 'count') + 1);
        }.observes('bar', 'baz'),
      });

      let obj = mixin({}, MyMixin);
      assert.equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

      set(obj, 'bar', 'BAZ');
      set(obj, 'baz', 'BAZ');
      assert.equal(get(obj, 'count'), 2, 'should invoke observer after change');
    }
  }
);

moduleFor(
  'Function.prototype.on() helper',
  class extends AbstractTestCase {
    ['@test sets up an event listener, and can trigger the function on multiple events'](assert) {
      if (!ENV.EXTEND_PROTOTYPES.Function) {
        assert.ok(
          'undefined' === typeof Function.prototype.on,
          'Function.prototype helper disabled'
        );
        return;
      }

      let MyMixin = Mixin.create({
        count: 0,

        foo: function() {
          set(this, 'count', get(this, 'count') + 1);
        }.on('bar', 'baz'),
      });

      let obj = mixin({}, Evented, MyMixin);
      assert.equal(get(obj, 'count'), 0, 'should not invoke listener immediately');

      obj.trigger('bar');
      obj.trigger('baz');
      assert.equal(get(obj, 'count'), 2, 'should invoke listeners when events trigger');
    }

    ['@test can be chained with observes'](assert) {
      if (!ENV.EXTEND_PROTOTYPES.Function) {
        assert.ok('Function.prototype helper disabled');
        return;
      }

      let MyMixin = Mixin.create({
        count: 0,
        bay: 'bay',
        foo: function() {
          set(this, 'count', get(this, 'count') + 1);
        }
          .observes('bay')
          .on('bar'),
      });

      let obj = mixin({}, Evented, MyMixin);
      assert.equal(get(obj, 'count'), 0, 'should not invoke listener immediately');

      set(obj, 'bay', 'BAY');
      obj.trigger('bar');
      assert.equal(get(obj, 'count'), 2, 'should invoke observer and listener');
    }
  }
);

moduleFor(
  'Function.prototype.property() helper',
  class extends AbstractTestCase {
    ['@test sets up a ComputedProperty'](assert) {
      if (!ENV.EXTEND_PROTOTYPES.Function) {
        assert.ok(
          'undefined' === typeof Function.prototype.property,
          'Function.prototype helper disabled'
        );
        return;
      }

      let MyClass = EmberObject.extend({
        firstName: null,
        lastName: null,
        fullName: function() {
          return get(this, 'firstName') + ' ' + get(this, 'lastName');
        }.property('firstName', 'lastName'),
      });

      let obj = MyClass.create({ firstName: 'Fred', lastName: 'Flinstone' });
      assert.equal(get(obj, 'fullName'), 'Fred Flinstone', 'should return the computed value');

      set(obj, 'firstName', 'Wilma');
      assert.equal(get(obj, 'fullName'), 'Wilma Flinstone', 'should return the new computed value');

      set(obj, 'lastName', '');
      assert.equal(get(obj, 'fullName'), 'Wilma ', 'should return the new computed value');
    }
  }
);
