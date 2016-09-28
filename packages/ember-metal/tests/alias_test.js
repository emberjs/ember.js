import alias from '../alias';
import { defineProperty } from '../properties';
import { get } from '../property_get';
import { set } from '../property_set';
import { meta } from '../meta';
import { isWatching } from '../watching';
import { addObserver, removeObserver } from '../observer';
import { tagFor } from '../tags';

let obj, count;

QUnit.module('ember-metal/alias', {
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

QUnit.test('old dependent keys should not trigger property changes', function() {
  let obj1 = Object.create(null);
  defineProperty(obj1, 'foo', null, null);
  defineProperty(obj1, 'bar', alias('foo'));
  defineProperty(obj1, 'baz', alias('foo'));
  defineProperty(obj1, 'baz', alias('bar')); // redefine baz
  addObserver(obj1, 'baz', incrementCount);

  set(obj1, 'foo', 'FOO');
  equal(count, 1);

  removeObserver(obj1, 'baz', incrementCount);

  set(obj1, 'foo', 'OOF');
  equal(count, 1);
});

QUnit.test(`inheriting an observer of the alias from the prototype then
            redefining the alias on the instance to another property dependent on same key
            does not call the observer twice`, function() {
  let obj1 = Object.create(null);

  meta(obj1).proto = obj1;

  defineProperty(obj1, 'foo', null, null);
  defineProperty(obj1, 'bar', alias('foo'));
  defineProperty(obj1, 'baz', alias('foo'));
  addObserver(obj1, 'baz', incrementCount);

  let obj2 = Object.create(obj1);
  defineProperty(obj2, 'baz', alias('bar')); // override baz

  set(obj2, 'foo', 'FOO');
  equal(count, 1);

  removeObserver(obj2, 'baz', incrementCount);

  set(obj2, 'foo', 'OOF');
  equal(count, 1);
});

QUnit.test('an observer of the alias works if added after defining the alias', function() {
  defineProperty(obj, 'bar', alias('foo.faz'));
  addObserver(obj, 'bar', incrementCount);
  ok(isWatching(obj, 'foo.faz'));
  set(obj, 'foo.faz', 'BAR');
  equal(count, 1);
});

QUnit.test('an observer of the alias works if added before defining the alias', function() {
  addObserver(obj, 'bar', incrementCount);
  defineProperty(obj, 'bar', alias('foo.faz'));
  ok(isWatching(obj, 'foo.faz'));
  set(obj, 'foo.faz', 'BAR');
  equal(count, 1);
});

QUnit.test('object with alias is dirtied if interior object of alias is set after consumption', function () {
  defineProperty(obj, 'bar', alias('foo.faz'));
  get(obj, 'bar');
  assertDirty(obj, () => set(obj, 'foo.faz', 'BAR'), 'setting the aliased key should dirty the object');
});

QUnit.test('setting alias on self should fail assertion', function() {
  expectAssertion(() => defineProperty(obj, 'bar', alias('bar')), 'Setting alias \'bar\' on self');
});

function assertDirty(obj, callback, label) {
  let tag = tagFor(obj);
  let tagValue = tag.value();
  callback();
  ok(!tag.validate(tagValue), label);
}
