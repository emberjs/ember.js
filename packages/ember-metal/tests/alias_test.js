import { alias } from "ember-metal/alias";
import {
  Descriptor,
  defineProperty
} from "ember-metal/properties";
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import { meta } from 'ember-metal/utils';
import { isWatching } from "ember-metal/watching";
import {
  addObserver,
  removeObserver
} from "ember-metal/observer";
import { mixin, observer } from 'ember-metal/mixin';
import { computed } from 'ember-metal/computed';

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

test("Ember.cacheFor simple", function() {
  defineProperty(obj, 'baz', computed(function() {
    return 'quz';
  }));
  defineProperty(obj, 'bar', alias('baz'));
  equal(Ember.cacheFor(obj, 'bar'), undefined);
  Ember.get(obj, 'bar');
  deepEqual(Ember.cacheFor(obj, 'bar'), 'quz');
});

test("Ember.cacheFor nonCP", function() {
  defineProperty(obj, 'bar', alias('foo'));
  equal(Ember.cacheFor(obj, 'bar'), undefined);
  Ember.get(obj, 'bar');
  equal(Ember.cacheFor(obj, 'bar'), undefined);
});

test("Ember.cacheFor non path CP", function() {
  defineProperty(obj, 'bar', alias('foo.faz'));
  equal(Ember.cacheFor(obj, 'bar'), undefined);
  Ember.get(obj, 'bar');
  equal(Ember.cacheFor(obj, 'bar'), undefined);
});
