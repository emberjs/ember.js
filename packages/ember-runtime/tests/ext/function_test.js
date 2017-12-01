import { ENV } from 'ember-environment';
import { Mixin, mixin } from 'ember-metal';
import { testBoth } from 'internal-test-helpers';
import EmberObject from '../../system/object';
import Evented from '../../mixins/evented';

QUnit.module('Function.prototype.observes() helper');

testBoth('global observer helper takes multiple params', function(get, set) {
  if (!ENV.EXTEND_PROTOTYPES.Function) {
    ok('undefined' === typeof Function.prototype.observes, 'Function.prototype helper disabled');
    return;
  }

  let MyMixin = Mixin.create({

    count: 0,

    foo: function() {
      set(this, 'count', get(this, 'count') + 1);
    }.observes('bar', 'baz')

  });

  let obj = mixin({}, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', 'BAZ');
  set(obj, 'baz', 'BAZ');
  equal(get(obj, 'count'), 2, 'should invoke observer after change');
});

QUnit.module('Function.prototype.on() helper');

testBoth('sets up an event listener, and can trigger the function on multiple events', function(get, set) {
  if (!ENV.EXTEND_PROTOTYPES.Function) {
    ok('undefined' === typeof Function.prototype.on, 'Function.prototype helper disabled');
    return;
  }

  let MyMixin = Mixin.create({

    count: 0,

    foo: function() {
      set(this, 'count', get(this, 'count') + 1);
    }.on('bar', 'baz')

  });

  let obj = mixin({}, Evented, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke listener immediately');

  obj.trigger('bar');
  obj.trigger('baz');
  equal(get(obj, 'count'), 2, 'should invoke listeners when events trigger');
});

testBoth('can be chained with observes', function(get, set) {
  if (!ENV.EXTEND_PROTOTYPES.Function) {
    ok('Function.prototype helper disabled');
    return;
  }

  let MyMixin = Mixin.create({

    count: 0,
    bay: 'bay',
    foo: function() {
      set(this, 'count', get(this, 'count') + 1);
    }.observes('bay').on('bar')
  });

  let obj = mixin({}, Evented, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke listener immediately');

  set(obj, 'bay', 'BAY');
  obj.trigger('bar');
  equal(get(obj, 'count'), 2, 'should invoke observer and listener');
});

QUnit.module('Function.prototype.property() helper');

testBoth('sets up a ComputedProperty', function(get, set) {
  if (!ENV.EXTEND_PROTOTYPES.Function) {
    ok('undefined' === typeof Function.prototype.property, 'Function.prototype helper disabled');
    return;
  }

  let MyClass = EmberObject.extend({
    firstName: null,
    lastName: null,
    fullName: function() {
      return get(this, 'firstName') + ' ' + get(this, 'lastName');
    }.property('firstName', 'lastName')
  });

  let obj = MyClass.create({ firstName: 'Fred', lastName: 'Flintstone' });
  equal(get(obj, 'fullName'), 'Fred Flintstone', 'should return the computed value');

  set(obj, 'firstName', 'Wilma');
  equal(get(obj, 'fullName'), 'Wilma Flintstone', 'should return the new computed value');

  set(obj, 'lastName', '');
  equal(get(obj, 'fullName'), 'Wilma ', 'should return the new computed value');
});
