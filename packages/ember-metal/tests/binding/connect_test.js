// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals GlobalA:true GlobalB:true */

require('ember-metal/~tests/props_helper');

module('system/mixin/binding/connect_test');

function performTest(binding, a, b, get, set, skipFirst) {

  if (!skipFirst) {
    Ember.run.sync();
    equal(get(a, 'foo'), 'FOO', 'a should not have changed');
    equal(get(b, 'bar'), 'BAR', 'b should not have changed');
  }

  binding.connect(a);
  equal(get(a, 'foo'), 'FOO', 'a should not have changed before sync');
  equal(get(b, 'bar'), 'BAR', 'b should not have changed before sync');

  Ember.run.sync();
  equal(get(a, 'foo'), 'BAR', 'a should have changed');
  equal(get(b, 'bar'), 'BAR', 'b should have changed');
  //
  // make sure changes sync both ways
  set(b, 'bar', 'BAZZ');
  Ember.run.sync();
  equal(get(a, 'foo'), 'BAZZ', 'a should have changed');

  set(a, 'foo', 'BARF');
  Ember.run.sync();
  equal(get(b, 'bar'), 'BARF', 'a should have changed');
}

testBoth('Connecting a binding between two properties', function(get, set) {
  var a = { foo: 'FOO', bar: 'BAR' };

  // a.bar -> a.foo
  var binding = new Ember.Binding('foo', 'bar');

  performTest(binding, a, a, get, set);
});

testBoth('Connecting a binding between two objects', function(get, set) {
  var b = { bar: 'BAR' };
  var a = { foo: 'FOO', b: b };

  // b.bar -> a.foo
  var binding = new Ember.Binding('foo', 'b.bar');

  performTest(binding, a, b, get, set);
});

testBoth('Connecting a binding between two objects through property defined after connect', function(get, set) {
  var b = { bar: 'BAR' };
  var a = { foo: 'FOO' };

  // b.bar -> a.foo
  var binding = new Ember.Binding('foo', 'b.bar');
  binding.connect(a);

  Ember.defineProperty(a, 'b', Ember.SIMPLE_PROPERTY, b);

  performTest(binding, a, b, get, set, true);
});

testBoth('Connecting a binding between two objects through property overriden after connect', function(get, set) {
  var c = { bar: 'BAD!' };
  var b = { bar: 'BAR' };
  var a = { foo: 'FOO', b: c };

  // b.bar -> a.foo
  var binding = new Ember.Binding('foo', 'b.bar');
  binding.connect(a);

  equal(Ember.isWatching(c, 'bar'), true, 'should be watching bar');

  Ember.Mixin.create({b: b}).apply(a);

  equal(Ember.isWatching(c, 'bar'), false, 'should not be watching bar');

  performTest(binding, a, b, get, set, true);
});

testBoth('Connecting a binding to path', function(get, set) {
  var a = { foo: 'FOO' };
  GlobalB = {
    b: { bar: 'BAR' }
  };

  var b = get(GlobalB, 'b');

  // globalB.b.bar -> a.foo
  var binding = new Ember.Binding('foo', 'GlobalB.b.bar');

  performTest(binding, a, b, get, set);

  // make sure modifications update
  b = { bar: 'BIFF' };
  set(GlobalB, 'b', b);
  Ember.run.sync();
  equal(get(a, 'foo'), 'BIFF', 'a should have changed');

});

testBoth('Calling connect more than once', function(get, set) {
  var b = { bar: 'BAR' };
  var a = { foo: 'FOO', b: b };

  // b.bar -> a.foo
  var binding = new Ember.Binding('foo', 'b.bar');
  binding.connect(a);

  performTest(binding, a, b, get, set, true);
});

testBoth('Bindings should be inherited', function(get, set) {

  var a = { foo: 'FOO', b: { bar: 'BAR' } };
  var binding = new Ember.Binding('foo', 'b.bar');
  binding.connect(a);

  var a2 = Ember.create(a);
  Ember.run.sync();
  equal(get(a2, 'foo'), "BAR", "Should have synced binding on child");
  equal(get(a,  'foo'), "BAR", "Should NOT have synced binding on parent");

  set(a2, 'b', { bar: 'BAZZ' });
  Ember.run.sync();

  equal(get(a2, 'foo'), "BAZZ", "Should have synced binding on child");
  equal(get(a,  'foo'), "BAR", "Should NOT have synced binding on parent");

});

test('inherited bindings should sync on create', function() {

  var A = function() {
    Ember.bind(this, 'foo', 'bar.baz');
  };

  var a = new A();
  Ember.set(a, 'bar', { baz: 'BAZ' });

  Ember.run.sync();
  equal(Ember.get(a, 'foo'), 'BAZ', 'should have synced binding on new obj');
});

