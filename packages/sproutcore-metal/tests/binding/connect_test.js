// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals GlobalA GlobalB testBoth */

require('sproutcore-runtime/~tests/props_helper');

module('system/mixin/binding/connect_test');

function performTest(binding, a, b, get, set, skipFirst) {
  
  if (!skipFirst) {
    SC.run.sync();
    equals(get(a, 'foo'), 'FOO', 'a should not have changed');
    equals(get(b, 'bar'), 'BAR', 'b should not have changed');
  }

  binding.connect(a);
  equals(get(a, 'foo'), 'FOO', 'a should not have changed before sync');
  equals(get(b, 'bar'), 'BAR', 'b should not have changed before sync');
  
  SC.run.sync();
  equals(get(a, 'foo'), 'BAR', 'a should have changed');
  equals(get(b, 'bar'), 'BAR', 'b should have changed');
  // 
  // make sure changes sync both ways
  set(b, 'bar', 'BAZZ');
  SC.run.sync();
  equals(get(a, 'foo'), 'BAZZ', 'a should have changed');
  
  set(a, 'foo', 'BARF');
  SC.run.sync();
  equals(get(b, 'bar'), 'BARF', 'a should have changed');
}

testBoth('Connecting a binding between two properties', function(get, set) {
  var a = SC.Object.create({ foo: 'FOO', bar: 'BAR' });
  
  // a.bar -> a.foo
  var binding = new SC.Binding('foo', 'bar');

  performTest(binding, a, a, get, set);
});

testBoth('Connecting a binding between two objects', function(get, set) {
  var b = SC.Object.create({ bar: 'BAR' });
  var a = SC.Object.create({ foo: 'FOO', b: b });
  
  // b.bar -> a.foo
  var binding = new SC.Binding('foo', 'b.bar');

  performTest(binding, a, b, get, set);
});

testBoth('Connecting a binding to path', function(get, set) {
  var a = SC.Object.create({ foo: 'FOO' });
  GlobalB = SC.Object.create({
    b: SC.Object.create({ bar: 'BAR' })
  }) ;
  
  var b = get(GlobalB, 'b');
  
  // globalB.b.bar -> a.foo
  var binding = new SC.Binding('foo', 'GlobalB.b.bar');
  
  performTest(binding, a, b, get, set);

  // make sure modifications update
  b = SC.Object.create({ bar: 'BIFF' });
  set(GlobalB, 'b', b);
  SC.run.sync();
  equals(get(a, 'foo'), 'BIFF', 'a should have changed');
  
});

testBoth('Calling connect more than once', function(get, set) {
  var b = SC.Object.create({ bar: 'BAR' });
  var a = SC.Object.create({ foo: 'FOO', b: b });
  
  // b.bar -> a.foo
  var binding = new SC.Binding('foo', 'b.bar');
  binding.connect(a);

  performTest(binding, a, b, get, set, true);
});

testBoth('Bindings should be inherited', function(get, set) {

  var a = { foo: 'FOO', b: { bar: 'BAR' } };
  var binding = new SC.Binding('foo', 'b.bar');
  binding.connect(a);
  
  var a2 = SC.create(a);
  SC.run.sync();
  equals(get(a2, 'foo'), "BAR", "Should have synced binding on child");
  equals(get(a,  'foo'), "BAR", "Should NOT have synced binding on parent");

  set(a2, 'b', { bar: 'BAZZ' });
  SC.run.sync();
  
  equals(get(a2, 'foo'), "BAZZ", "Should have synced binding on child");
  equals(get(a,  'foo'), "BAR", "Should NOT have synced binding on parent");

});

test('inherited bindings should sync on create', function() {

  var A = SC.Object.extend({
    fooBinding: 'bar.baz'
  });
  
  var a = A.create({
    bar: SC.Object.create({ baz: 'BAZ' })
  });
  
  SC.run.sync();
  equals(SC.get(a, 'foo'), 'BAZ', 'should have synced binding on new obj');
});

