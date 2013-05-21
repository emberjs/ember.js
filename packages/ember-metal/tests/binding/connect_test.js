/*globals GlobalA:true GlobalB:true */

require('ember-metal/~tests/props_helper');

function performTest(binding, a, b, get, set, connect) {
  if (connect === undefined) connect = function(){binding.connect(a);};

  ok(!Ember.run.backburner.currentInstance, 'performTest should not have a backburner\'s instance');

  equal(get(a, 'foo'), 'FOO', 'a should not have changed');
  equal(get(b, 'bar'), 'BAR', 'b should not have changed');

  connect();

  equal(get(a, 'foo'), 'BAR', 'a should have changed');
  equal(get(b, 'bar'), 'BAR', 'b should have changed');
  //
  // make sure changes sync both ways
  Ember.run(function () {
    set(b, 'bar', 'BAZZ');
  });
  equal(get(a, 'foo'), 'BAZZ', 'a should have changed');

  Ember.run(function () {
    set(a, 'foo', 'BARF');
  });
  equal(get(b, 'bar'), 'BARF', 'a should have changed');
}

module("Ember.Binding");

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

  Ember.run(function(){
    set(GlobalB, 'b', b);
  });

  equal(get(a, 'foo'), 'BIFF', 'a should have changed');

});

testBoth('Calling connect more than once', function(get, set) {
  var b = { bar: 'BAR' };
  var a = { foo: 'FOO', b: b };

  // b.bar -> a.foo
  var binding = new Ember.Binding('foo', 'b.bar');

  performTest(binding, a, b, get, set, function () {
    binding.connect(a);

    binding.connect(a);
  });
});

testBoth('Bindings should be inherited', function(get, set) {

  var a = { foo: 'FOO', b: { bar: 'BAR' } };
  var binding = new Ember.Binding('foo', 'b.bar');
  var a2;

  Ember.run(function () {
    binding.connect(a);

    a2 = Ember.create(a);
    Ember.rewatch(a2);
  });

  equal(get(a2, 'foo'), "BAR", "Should have synced binding on child");
  equal(get(a,  'foo'), "BAR", "Should NOT have synced binding on parent");

  Ember.run(function () {
    set(a2, 'b', { bar: 'BAZZ' });
  });

  equal(get(a2, 'foo'), "BAZZ", "Should have synced binding on child");
  equal(get(a,  'foo'), "BAR", "Should NOT have synced binding on parent");

});

test('inherited bindings should sync on create', function() {
  var a;
  Ember.run(function () {
    var A = function() {
      Ember.bind(this, 'foo', 'bar.baz');
    };

    a = new A();
    Ember.set(a, 'bar', { baz: 'BAZ' });
  });

  equal(Ember.get(a, 'foo'), 'BAZ', 'should have synced binding on new obj');
});

