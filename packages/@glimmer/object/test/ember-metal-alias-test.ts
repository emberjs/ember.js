import { alias } from '@glimmer/object';
import{ Meta } from '@glimmer/object-reference';
import { get, set, defineProperty } from './support';

let obj: any;
let count: number;

QUnit.module('defineProperty - alias', {
  beforeEach() {
    obj = { foo: { faz: 'FOO' } };
    count = 0;
  },
  afterEach() {
    obj = null;
  }
});

function shouldBeClean(..._: any[]) {
  // a "clean" reference is allowed to report dirty
}

function shouldBeDirty(..._: any[]) {
  // QUnit.assert.equal(reference.isDirty(), true, msg || `${reference} should be dirty`);
}

QUnit.test('should proxy get to alt key', assert => {
  defineProperty(obj, 'bar', alias('foo.faz'));
  assert.equal(get(obj, 'bar'), 'FOO');
});

QUnit.test('should proxy set to alt key', assert => {
  defineProperty(obj, 'bar', alias('foo.faz'));
  set(obj, 'bar', 'BAR');
  assert.equal(get(obj, 'foo.faz'), 'BAR');
});

QUnit.test('should observe the alias', assert => {
  defineProperty(obj, 'bar', alias('foo.faz'));
  let ref = Meta.for(obj).root().get('bar');
  let val = ref.value();
  assert.equal(val, 'FOO');
  shouldBeClean(ref);

  set(obj.foo, 'faz', 'FAZ');
  shouldBeDirty(ref, "after setting the property the alias is for");
  assert.equal(ref.value(), 'FAZ');
});

function observe(obj: any, key: string) {
  let ref = Meta.for(obj).root().get(key);
  // ref.value();
  return ref;
}

QUnit.test('old dependent keys should not trigger property changes', assert => {
  let obj1 = Object.create(null);
  defineProperty(obj1, 'foo', null);
  defineProperty(obj1, 'bar', alias('foo'));
  defineProperty(obj1, 'baz', alias('foo'));
  defineProperty(obj1, 'baz', alias('bar')); // redefine baz

  let ref = observe(obj1, 'baz');
  assert.equal(ref.value(), null, "The value starts out null");

  set(obj1, 'foo', 'FOO');
  assert.equal(ref.value(), 'FOO', "And it sees the new value");

  set(obj1, 'foo', 'OOF');
});

QUnit.test('overridden dependent keys should not trigger property changes', assert => {
  let obj1 = Object.create(null);
  defineProperty(obj1, 'foo', null);
  defineProperty(obj1, 'bar', alias('foo'));
  defineProperty(obj1, 'baz', alias('foo'));

  let ref = observe(obj1, 'baz');
  assert.equal(ref.value(), null);

  let obj2 = Object.create(obj1);
  defineProperty(obj2, 'baz', alias('bar')); // override baz

  set(obj2, 'foo', 'FOO');

  set(obj2, 'foo', 'OOF');
});

QUnit.test('begins watching alt key as soon as alias is watched', assert => {
  defineProperty(obj, 'bar', alias('foo.faz'));

  let ref = observe(obj, 'bar');
  assert.equal(ref.value(), 'FOO');

  set(obj, 'foo.faz', 'BAR');

  assert.equal(ref.value(), 'BAR');
});

QUnit.test('immediately sets up dependencies if already being watched', assert => {
  let ref = observe(obj, 'bar');
  defineProperty(obj, 'bar', alias('foo.faz'));

  set(obj, 'foo.faz', 'BAR');
  assert.equal(ref.value(), 'BAR');
  // QUnit.assert.equal(count, 1);
});

QUnit.test('setting alias on self should fail assertion', assert => {
  assert.throws(function() {
    defineProperty(obj, 'bar', alias('bar'));
  }, /Setting alias \'bar\' on self/);
});
