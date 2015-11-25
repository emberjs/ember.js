import { alias } from 'htmlbars-object';
import { Meta, fork } from 'htmlbars-reference';
import { LITERAL } from 'htmlbars-util';
import { get, set, defineProperty } from './support';

var obj, count;

QUnit.module('defineProperty - alias', {
  setup() {
    obj = { foo: { faz: 'FOO' } };
    count = 0;
  },
  teardown() {
    obj = null;
  }
});

function incrementCount() {
  count++;
}

QUnit.test('should proxy get to alt key', function() {
  defineProperty(obj, 'bar', alias('foo.faz'));
  equal(get(obj, 'bar'), 'FOO');
});

QUnit.test('should proxy set to alt key', function() {
  defineProperty(obj, 'bar', alias('foo.faz'));
  set(obj, 'bar', 'BAR');
  equal(get(obj, 'foo.faz'), 'BAR');
});

QUnit.test('should observe the alias', function() {
  defineProperty(obj, 'bar', alias('foo.faz'));
  let ref = Meta.for(obj).root().get(LITERAL('bar'));
  let val = ref.value();
  equal(val, 'FOO');
  equal(ref.isDirty(), false);

  set(obj.foo, 'faz', 'FAZ');
  equal(ref.isDirty(), true);
  equal(ref.value(), 'FAZ');
});

function observe(obj, key) {
  let ref = fork(Meta.for(obj).root().get(key));
  // ref.value();
  return ref;
}

QUnit.test('old dependent keys should not trigger property changes', function() {
  var obj1 = Object.create(null);
  defineProperty(obj1, 'foo', null);
  defineProperty(obj1, 'bar', alias('foo'));
  defineProperty(obj1, 'baz', alias('foo'));
  defineProperty(obj1, 'baz', alias('bar')); // redefine baz

  let ref = observe(obj1, 'baz');
  equal(ref.value(), null, "The value starts out null");
  equal(ref.isDirty(), false, "The value isn't dirty anymore");

  set(obj1, 'foo', 'FOO');
  equal(ref.isDirty(), true, "Now that we set the dependent value, the ref is dirty");
  equal(ref.value(), 'FOO', "And it sees the new value");
  equal(ref.isDirty(), false, "But now that we got the value, the ref is no longer dirty");

  ref.destroy();

  set(obj1, 'foo', 'OOF');
  equal(ref.isDirty(), false, "Destroyed refs aren't dirty");
});

QUnit.test('overridden dependent keys should not trigger property changes', function() {
  var obj1 = Object.create(null);
  defineProperty(obj1, 'foo', null);
  defineProperty(obj1, 'bar', alias('foo'));
  defineProperty(obj1, 'baz', alias('foo'));

  let ref = observe(obj1, 'baz');
  equal(ref.value(), null);
  equal(ref.isDirty(), false);

  var obj2 = Object.create(obj1);
  defineProperty(obj2, 'baz', alias('bar')); // override baz

  set(obj2, 'foo', 'FOO');
  equal(ref.isDirty(), false);

  ref.destroy();

  set(obj2, 'foo', 'OOF');

  equal(ref.isDirty(), false);
});

QUnit.test('begins watching alt key as soon as alias is watched', function() {
  defineProperty(obj, 'bar', alias('foo.faz'));

  let ref = observe(obj, 'bar');
  equal(ref.value(), 'FOO');

  set(obj, 'foo.faz', 'BAR');

  equal(ref.isDirty(), true);
  equal(ref.value(), 'BAR');
});

QUnit.test('immediately sets up dependencies if already being watched', function() {
  let ref = observe(obj, 'bar');
  defineProperty(obj, 'bar', alias('foo.faz'));
  equal(ref.isDirty(), true, "The reference starts out dirty");

  set(obj, 'foo.faz', 'BAR');
  equal(ref.isDirty(), true, "The reference is still dirty");
  equal(ref.value(), 'BAR');
  // equal(count, 1);
});

QUnit.test('setting alias on self should fail assertion', assert => {
  assert.throws(function() {
    defineProperty(obj, 'bar', alias('bar'));
  }, /Setting alias \'bar\' on self/);
});