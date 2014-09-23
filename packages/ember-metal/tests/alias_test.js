import alias from "ember-metal/alias";
import { defineProperty } from "ember-metal/properties";
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import { meta } from 'ember-metal/utils';
import { isWatching } from "ember-metal/watching";
import { addObserver, removeObserver } from "ember-metal/observer";

var obj, count;

QUnit.module('ember-metal/alias', {
  setup: function() {
    obj = { foo: { faz: 'FOO' } };
    count = 0;
  },
  teardown: function() {
    obj = null;
  }
});

function incrementCount() {
  count++;
}

test('should proxy get to alt key', function() {
  defineProperty(obj, 'bar', alias('foo.faz'));
  equal(get(obj, 'bar'), 'FOO');
});

test('should proxy set to alt key', function() {
  defineProperty(obj, 'bar', alias('foo.faz'));
  set(obj, 'bar', 'BAR');
  equal(get(obj, 'foo.faz'), 'BAR');
});

test('basic lifecycle', function() {
  defineProperty(obj, 'bar', alias('foo.faz'));
  var m = meta(obj);
  addObserver(obj, 'bar', incrementCount);
  equal(m.deps['foo.faz'].bar, 1);
  removeObserver(obj, 'bar', incrementCount);
  equal(m.deps['foo.faz'].bar, 0);
});

test('begins watching alt key as soon as alias is watched', function() {
  defineProperty(obj, 'bar', alias('foo.faz'));
  addObserver(obj, 'bar', incrementCount);
  ok(isWatching(obj, 'foo.faz'));
  set(obj, 'foo.faz', 'BAR');
  equal(count, 1);
});

test('immediately sets up dependencies if already being watched', function() {
  addObserver(obj, 'bar', incrementCount);
  defineProperty(obj, 'bar', alias('foo.faz'));
  ok(isWatching(obj, 'foo.faz'));
  set(obj, 'foo.faz', 'BAR');
  equal(count, 1);
});

test('setting alias on self should fail assertion', function() {
  expectAssertion(function() {
    defineProperty(obj, 'bar', alias('bar'));
  }, "Setting alias 'bar' on self");
});
