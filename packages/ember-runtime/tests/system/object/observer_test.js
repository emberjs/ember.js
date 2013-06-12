/*globals testBoth */

require('ember-runtime/~tests/props_helper');

module('Ember.Object observer');

testBoth('observer on class', function(get, set) {

  var MyClass = Ember.Object.extend({

    count: 0,

    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar')

  });

  var obj = new MyClass();
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', "BAZ");
  equal(get(obj, 'count'), 1, 'should invoke observer after change');

});

testBoth('observer on subclass', function(get, set) {

  var MyClass = Ember.Object.extend({

    count: 0,

    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar')

  });

  var Subclass = MyClass.extend({
    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'baz')
  });

  var obj = new Subclass();
  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', "BAZ");
  equal(get(obj, 'count'), 0, 'should not invoke observer after change');

  set(obj, 'baz', "BAZ");
  equal(get(obj, 'count'), 1, 'should invoke observer after change');

});

testBoth('observer on instance', function(get, set) {

  var obj = Ember.Object.createWithMixins({

    count: 0,

    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar')

  });

  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', "BAZ");
  equal(get(obj, 'count'), 1, 'should invoke observer after change');

});

testBoth('observer on instance overridding class', function(get, set) {

  var MyClass = Ember.Object.extend({

    count: 0,

    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar')

  });

  var obj = MyClass.createWithMixins({
    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'baz') // <-- change property we observe
  });

  equal(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', "BAZ");
  equal(get(obj, 'count'), 0, 'should not invoke observer after change');

  set(obj, 'baz', "BAZ");
  equal(get(obj, 'count'), 1, 'should invoke observer after change');

});

testBoth('observer should not fire after being destroyed', function(get, set) {

  var obj = Ember.Object.createWithMixins({
    count: 0,
    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar')
  });

  equal(get(obj, 'count'), 0, 'precond - should not invoke observer immediately');

  Ember.run(function() { obj.destroy(); });

  if (Ember.assert) {
    expectAssertion(function() {
      set(obj, 'bar', "BAZ");
    }, "calling set on destroyed object");
  } else {
    set(obj, 'bar', "BAZ");
  }

  equal(get(obj, 'count'), 0, 'should not invoke observer after change');
});
// ..........................................................
// COMPLEX PROPERTIES
//


testBoth('chain observer on class', function(get, set) {

  var MyClass = Ember.Object.extend({
    count: 0,

    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar.baz')
  });

  var obj1 = MyClass.create({
    bar: { baz: 'biff' }
  });

  var obj2 = MyClass.create({
    bar: { baz: 'biff2' }
  });

  equal(get(obj1, 'count'), 0, 'should not invoke yet');
  equal(get(obj2, 'count'), 0, 'should not invoke yet');

  set(get(obj1, 'bar'), 'baz', 'BIFF1');
  equal(get(obj1, 'count'), 1, 'should invoke observer on obj1');
  equal(get(obj2, 'count'), 0, 'should not invoke yet');

  set(get(obj2, 'bar'), 'baz', 'BIFF2');
  equal(get(obj1, 'count'), 1, 'should not invoke again');
  equal(get(obj2, 'count'), 1, 'should invoke observer on obj2');
});


testBoth('chain observer on class', function(get, set) {

  var MyClass = Ember.Object.extend({
    count: 0,

    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar.baz')
  });

  var obj1 = MyClass.createWithMixins({
    bar: { baz: 'biff' }
  });

  var obj2 = MyClass.createWithMixins({
    bar: { baz: 'biff2' },
    bar2: { baz: 'biff3' },

    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar2.baz')
  });

  equal(get(obj1, 'count'), 0, 'should not invoke yet');
  equal(get(obj2, 'count'), 0, 'should not invoke yet');

  set(get(obj1, 'bar'), 'baz', 'BIFF1');
  equal(get(obj1, 'count'), 1, 'should invoke observer on obj1');
  equal(get(obj2, 'count'), 0, 'should not invoke yet');

  set(get(obj2, 'bar'), 'baz', 'BIFF2');
  equal(get(obj1, 'count'), 1, 'should not invoke again');
  equal(get(obj2, 'count'), 0, 'should not invoke yet');

  set(get(obj2, 'bar2'), 'baz', 'BIFF3');
  equal(get(obj1, 'count'), 1, 'should not invoke again');
  equal(get(obj2, 'count'), 1, 'should invoke observer on obj2');
});
