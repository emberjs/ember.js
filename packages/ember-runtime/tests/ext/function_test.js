/*globals testBoth */

require('ember-runtime/~tests/props_helper');

module('Function.prototype.observes() helper');

testBoth('global observer helper takes multiple params', function(get, set) {

  if (Ember.EXTEND_PROTOTYPES === false) {
    ok('Function.prototype helper disabled');
    return ;
  }

  var MyMixin = Ember.Mixin.create({

    count: 0,

    foo: function() {
      set(this, 'count', get(this, 'count')+1);
    }.observes('bar', 'baz')

  });

  var obj = Ember.mixin({}, MyMixin);
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', "BAZ");
  set(obj, 'baz', "BAZ");
  equal(get(obj, 'count'), 2, 'should invoke observer after change');
});

module('Function.prototype.on() helper');

testBoth('sets up an event listener, and can trigger the function on multiple events', function(get, set) {

  if (Ember.EXTEND_PROTOTYPES === false) {
    ok('Function.prototype helper disabled');
    return ;
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
    return ;
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
