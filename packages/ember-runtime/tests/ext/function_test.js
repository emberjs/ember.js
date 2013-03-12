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


module('Function.prototype.inRunLoop() helper');

test('wraps function in run loop', function() {

  if (Ember.EXTEND_PROTOTYPES === false) {
    ok('Function.prototype helper disabled');
    return ;
  }

  function fn() {
    return Ember.run.currentRunLoop;
  }

  ok(!fn(), "vanilla fn() runs outside of run loop");

  var fnWrapped = fn.inRunLoop();

  var runLoop1 = fnWrapped(), runLoop2 = fnWrapped();
  ok(runLoop1, "fn.inRunLoop() runs within run loop");
  ok(runLoop2 && runLoop1 !== runLoop2, "additional calls to wrapped fn run within different run loops");
});

test('forwards arguments and context', function() {

  if (Ember.EXTEND_PROTOTYPES === false) {
    ok('Function.prototype helper disabled');
    return ;
  }

  var obj = {};

  function sum(a, b) {
    this.result = a + b;
    return this.result;
  }

  equal(sum.call(obj, 4, 3), 7, "vanilla sum function returns sum of args");
  equal(obj.result, 7, "vanilla sum function stores result in context");

  var sumWrapped = sum.inRunLoop();

  equal(sumWrapped.call(obj, 5, 7), 12, "wrapped sum function returns sum of args");
  equal(obj.result, 12, "wrapped sum function stores result in context");
});

