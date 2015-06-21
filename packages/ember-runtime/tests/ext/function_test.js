import Ember from 'ember-metal/core';
import { testBoth } from 'ember-metal/tests/props_helper';

QUnit.module('Function.prototype.observes() helper');

testBoth('global observer helper takes multiple params', function(get, set) {

  if (Ember.EXTEND_PROTOTYPES === false) {
    ok('undefined' === typeof Function.prototype.observes, 'Function.prototype helper disabled');
    return;
  }

  var MyMixin = Ember.Mixin.create({

    count: 0,

    foo: function() {
      set(this, 'count', get(this, 'count')+1);
    }.observes('bar', 'baz')

  });

  var obj = Ember.mixin({}, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', 'BAZ');
  set(obj, 'baz', 'BAZ');
  equal(get(obj, 'count'), 2, 'should invoke observer after change');
});

QUnit.module('Function.prototype.on() helper');

testBoth('sets up an event listener, and can trigger the function on multiple events', function(get, set) {

  if (Ember.EXTEND_PROTOTYPES === false) {
    ok('undefined' === typeof Function.prototype.on, 'Function.prototype helper disabled');
    return;
  }

  var MyMixin = Ember.Mixin.create({

    count: 0,

    foo: function() {
      set(this, 'count', get(this, 'count')+1);
    }.on('bar', 'baz')

  });

  var obj = Ember.mixin({}, Ember.Evented, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke listener immediately');

  obj.trigger('bar');
  obj.trigger('baz');
  equal(get(obj, 'count'), 2, 'should invoke listeners when events trigger');
});

testBoth('can be chained with observes', function(get, set) {

  if (Ember.EXTEND_PROTOTYPES === false) {
    ok('Function.prototype helper disabled');
    return;
  }

  var MyMixin = Ember.Mixin.create({

    count: 0,
    bay: 'bay',
    foo: function() {
      set(this, 'count', get(this, 'count')+1);
    }.observes('bay').on('bar')
  });

  var obj = Ember.mixin({}, Ember.Evented, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke listener immediately');

  set(obj, 'bay', 'BAY');
  obj.trigger('bar');
  equal(get(obj, 'count'), 2, 'should invoke observer and listener');
});

QUnit.module('Function.prototype.property() helper');

testBoth('sets up a ComputedProperty', function(get, set) {

  if (Ember.EXTEND_PROTOTYPES === false) {
    ok('undefined' === typeof Function.prototype.property, 'Function.prototype helper disabled');
    return;
  }

  var MyClass = Ember.Object.extend({
    firstName: null,
    lastName: null,
    fullName: function() {
      return get(this, 'firstName') + ' ' + get(this, 'lastName');
    }.property('firstName', 'lastName')
  });

  var obj = MyClass.create({ firstName: 'Fred', lastName: 'Flinstone' });
  equal(get(obj, 'fullName'), 'Fred Flinstone', 'should return the computed value');

  set(obj, 'firstName', 'Wilma');
  equal(get(obj, 'fullName'), 'Wilma Flinstone', 'should return the new computed value');

  set(obj, 'lastName', '');
  equal(get(obj, 'fullName'), 'Wilma ', 'should return the new computed value');
});
