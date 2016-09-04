import { context } from 'ember-environment';
import { testBoth } from 'internal-test-helpers';
import {
  Binding,
  bind
} from '../../binding';
import run from '../../run_loop';
import { set } from '../../property_set';
import { get } from '../../property_get';

function performTest(binding, a, b, get, set, connect) {
  if (connect === undefined) {
    connect = () => binding.connect(a);
  }

  ok(!run.currentRunLoop, 'performTest should not have a currentRunLoop');

  equal(get(a, 'foo'), 'FOO', 'a should not have changed');
  equal(get(b, 'bar'), 'BAR', 'b should not have changed');

  connect();

  equal(get(a, 'foo'), 'BAR', 'a should have changed');
  equal(get(b, 'bar'), 'BAR', 'b should have changed');
  //
  // make sure changes sync both ways
  run(() => set(b, 'bar', 'BAZZ'));
  equal(get(a, 'foo'), 'BAZZ', 'a should have changed');

  run(() => set(a, 'foo', 'BARF'));
  equal(get(b, 'bar'), 'BARF', 'a should have changed');
}

let originalLookup, lookup, GlobalB;

QUnit.module('Ember.Binding', {
  setup() {
    originalLookup = context.lookup;
    context.lookup = lookup = {};
  },
  teardown() {
    lookup = null;
    context.lookup = originalLookup;
  }
});

testBoth('Connecting a binding between two properties', function(get, set) {
  let a = { foo: 'FOO', bar: 'BAR' };

  // a.bar -> a.foo
  let binding = new Binding('foo', 'bar');

  expectDeprecation(() => {
    performTest(binding, a, a, get, set);
  }, /`Ember\.Binding` is deprecated./);
});

testBoth('Connecting a oneWay binding raises a deprecation', function(get, set) {
  let a = { foo: 'FOO', bar: 'BAR', toString() { return '<custom object ID here>'; } };

  // a.bar -> a.foo
  let binding = new Binding('foo', 'bar').oneWay();

  expectDeprecation(() => { binding.connect(a); }, /`Ember.Binding` is deprecated/);
});

testBoth('Connecting a binding between two objects', function(get, set) {
  let b = { bar: 'BAR' };
  let a = { foo: 'FOO', b: b };

  // b.bar -> a.foo
  let binding = new Binding('foo', 'b.bar');

  expectDeprecation(() => {
    performTest(binding, a, b, get, set);
  }, /`Ember\.Binding` is deprecated./);
});

testBoth('Connecting a binding to path', function(get, set) {
  let a = { foo: 'FOO' };
  lookup['GlobalB'] = GlobalB = {
    b: { bar: 'BAR' }
  };

  let b = get(GlobalB, 'b');

  // globalB.b.bar -> a.foo
  let binding = new Binding('foo', 'GlobalB.b.bar');

  expectDeprecation(() => {
    performTest(binding, a, b, get, set);
  }, /`Ember\.Binding` is deprecated./);

  // make sure modifications update
  b = { bar: 'BIFF' };

  run(() => set(GlobalB, 'b', b));

  equal(get(a, 'foo'), 'BIFF', 'a should have changed');
});

testBoth('Calling connect more than once', function(get, set) {
  let b = { bar: 'BAR' };
  let a = { foo: 'FOO', b: b };

  // b.bar -> a.foo
  let binding = new Binding('foo', 'b.bar');

  expectDeprecation(() => {
    performTest(binding, a, b, get, set, () => {
      binding.connect(a);
      binding.connect(a);
    });
  }, /`Ember\.Binding` is deprecated./);
});

QUnit.test('inherited bindings should sync on create', function() {
  let a;
  run(() => {
    function A() {
      bind(this, 'foo', 'bar.baz');
    }

    expectDeprecation(() => a = new A(), /`Ember\.Binding` is deprecated/);

    set(a, 'bar', { baz: 'BAZ' });
  });

  equal(get(a, 'foo'), 'BAZ', 'should have synced binding on new obj');
});
