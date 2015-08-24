import alias from 'ember-metal/alias';
import { defineProperty } from 'ember-metal/properties';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import { meta } from 'ember-metal/meta';
import { isWatching } from 'ember-metal/watching';
import { addObserver, removeObserver } from 'ember-metal/observer';

var obj, count;

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

QUnit.test('basic lifecycle', function() {
  defineProperty(obj, 'bar', alias('foo.faz'));
  var m = meta(obj);
  addObserver(obj, 'bar', incrementCount);
  equal(m.peekDeps('foo.faz', 'bar'), 1);
  removeObserver(obj, 'bar', incrementCount);
  equal(m.peekDeps('foo.faz', 'bar'), 0);
});

QUnit.test('old dependent keys should not trigger property changes', function() {
  var obj1 = Object.create(null);
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

QUnit.test('overridden dependent keys should not trigger property changes', function() {
  var obj1 = Object.create(null);
  defineProperty(obj1, 'foo', null, null);
  defineProperty(obj1, 'bar', alias('foo'));
  defineProperty(obj1, 'baz', alias('foo'));
  addObserver(obj1, 'baz', incrementCount);

  var obj2 = Object.create(obj1);
  defineProperty(obj2, 'baz', alias('bar')); // override baz

  set(obj2, 'foo', 'FOO');
  equal(count, 1);

  removeObserver(obj2, 'baz', incrementCount);

  set(obj2, 'foo', 'OOF');
  equal(count, 1);
});

QUnit.test('begins watching alt key as soon as alias is watched', function() {
  defineProperty(obj, 'bar', alias('foo.faz'));
  addObserver(obj, 'bar', incrementCount);
  ok(isWatching(obj, 'foo.faz'));
  set(obj, 'foo.faz', 'BAR');
  equal(count, 1);
});

QUnit.test('immediately sets up dependencies if already being watched', function() {
  addObserver(obj, 'bar', incrementCount);
  defineProperty(obj, 'bar', alias('foo.faz'));
  ok(isWatching(obj, 'foo.faz'));
  set(obj, 'foo.faz', 'BAR');
  equal(count, 1);
});

QUnit.test('setting alias on self should fail assertion', function() {
  expectAssertion(function() {
    defineProperty(obj, 'bar', alias('bar'));
  }, 'Setting alias \'bar\' on self');
});
