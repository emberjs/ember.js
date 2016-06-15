import { context } from 'ember-environment';
import { testBoth } from 'ember-metal/tests/props_helper';
import {
  Binding,
  bind
} from 'ember-metal/binding';
import run from 'ember-metal/run_loop';
import { set } from 'ember-metal/property_set';
import { get } from 'ember-metal/property_get';

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

  let deprecationMessage = '`Ember.Binding` is deprecated. Consider using an' +
    ' `alias` computed property instead.';

  expectDeprecation(() => {
    performTest(binding, a, a, get, set);
  }, deprecationMessage);
});

testBoth('Connecting a oneWay binding raises a deprecation', function(get, set) {
  let a = { foo: 'FOO', bar: 'BAR' };

  // a.bar -> a.foo
  let binding = new Binding('foo', 'bar').oneWay();

  let deprecationMessage = '`Ember.Binding` is deprecated. Since you' +
    ' are using a `oneWay` binding consider using a `readOnly` computed' +
    ' property instead.';

  expectDeprecation(() => { binding.connect(a); }, deprecationMessage);
});

testBoth('Connecting a binding between two objects', function(get, set) {
  let b = { bar: 'BAR' };
  let a = { foo: 'FOO', b: b };

  // b.bar -> a.foo
  let binding = new Binding('foo', 'b.bar');

  let deprecationMessage = '`Ember.Binding` is deprecated. Consider using an' +
    ' `alias` computed property instead.';

  expectDeprecation(() => {
    performTest(binding, a, b, get, set);
  }, deprecationMessage);
});

testBoth('Connecting a binding to path', function(get, set) {
  let a = { foo: 'FOO' };
  lookup['GlobalB'] = GlobalB = {
    b: { bar: 'BAR' }
  };

  let b = get(GlobalB, 'b');

  // globalB.b.bar -> a.foo
  let binding = new Binding('foo', 'GlobalB.b.bar');

  let deprecationMessage = '`Ember.Binding` is deprecated. Since you' +
    ' are binding to a global consider using a service instead.';

  expectDeprecation(() => {
    performTest(binding, a, b, get, set);
  }, deprecationMessage);

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

  let deprecationMessage = '`Ember.Binding` is deprecated. Consider using an' +
    ' `alias` computed property instead.';

  expectDeprecation(() => {
    performTest(binding, a, b, get, set, () => {
      binding.connect(a);
      binding.connect(a);
    });
  }, deprecationMessage);
});

QUnit.test('inherited bindings should sync on create', function() {
  let a;
  run(() => {
    function A() {
      bind(this, 'foo', 'bar.baz');
    }

    let deprecationMessage = '`Ember.Binding` is deprecated. Consider using an' +
      ' `alias` computed property instead.';

    expectDeprecation(() => a = new A(), deprecationMessage);

    set(a, 'bar', { baz: 'BAZ' });
  });

  equal(get(a, 'foo'), 'BAZ', 'should have synced binding on new obj');
});
