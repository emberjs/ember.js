import { testBoth } from 'ember-metal/tests/props_helper';
import {
  watch,
  unwatch
} from 'ember-metal/watching';
import { defineProperty } from 'ember-metal/properties';
import { addListener } from 'ember-metal/events';
import { computed } from 'ember-metal/computed';
import { set } from 'ember-metal/property_set';
import { peekMeta } from 'ember-metal/meta';

var willCount, didCount;

QUnit.module('unwatch', {
  setup() {
    willCount = didCount = 0;
  }
});

function addListeners(obj, keyPath) {
  addListener(obj, keyPath + ':before', function() {
    willCount++;
  });
  addListener(obj, keyPath + ':change', function() {
    didCount++;
  });
}

testBoth('unwatching a computed property - regular get/set', function(get, set) {
  var obj = {};
  defineProperty(obj, 'foo', computed({
    get: function() {
      return this.__foo;
    },
    set: function(keyName, value) {
      this.__foo = value;
      return this.__foo;
    }
  }));
  addListeners(obj, 'foo');

  watch(obj, 'foo');
  set(obj, 'foo', 'bar');
  equal(willCount, 1, 'should have invoked willCount');
  equal(didCount, 1, 'should have invoked didCount');

  unwatch(obj, 'foo');
  willCount = didCount = 0;
  set(obj, 'foo', 'BAZ');
  equal(willCount, 0, 'should NOT have invoked willCount');
  equal(didCount, 0, 'should NOT have invoked didCount');
});


testBoth('unwatching a regular property - regular get/set', function(get, set) {
  var obj = { foo: 'BIFF' };
  addListeners(obj, 'foo');

  watch(obj, 'foo');
  set(obj, 'foo', 'bar');
  equal(willCount, 1, 'should have invoked willCount');
  equal(didCount, 1, 'should have invoked didCount');

  unwatch(obj, 'foo');
  willCount = didCount = 0;
  set(obj, 'foo', 'BAZ');
  equal(willCount, 0, 'should NOT have invoked willCount');
  equal(didCount, 0, 'should NOT have invoked didCount');
});

QUnit.test('unwatching should be nested', function() {
  var obj = { foo: 'BIFF' };
  addListeners(obj, 'foo');

  watch(obj, 'foo');
  watch(obj, 'foo');
  set(obj, 'foo', 'bar');
  equal(willCount, 1, 'should have invoked willCount');
  equal(didCount, 1, 'should have invoked didCount');

  unwatch(obj, 'foo');
  willCount = didCount = 0;
  set(obj, 'foo', 'BAZ');
  equal(willCount, 1, 'should NOT have invoked willCount');
  equal(didCount, 1, 'should NOT have invoked didCount');

  unwatch(obj, 'foo');
  willCount = didCount = 0;
  set(obj, 'foo', 'BAZ');
  equal(willCount, 0, 'should NOT have invoked willCount');
  equal(didCount, 0, 'should NOT have invoked didCount');
});

testBoth('unwatching "length" property on an object', function(get, set) {
  var obj = { foo: 'RUN' };
  addListeners(obj, 'length');

  // Can watch length when it is undefined
  watch(obj, 'length');
  set(obj, 'length', '10k');
  equal(willCount, 1, 'should have invoked willCount');
  equal(didCount, 1, 'should have invoked didCount');

  // Should stop watching despite length now being defined (making object 'array-like')
  unwatch(obj, 'length');
  willCount = didCount = 0;
  set(obj, 'length', '5k');
  equal(willCount, 0, 'should NOT have invoked willCount');
  equal(didCount, 0, 'should NOT have invoked didCount');
});

testBoth('unwatch should not install a meta if non-existed', function() {
  var obj = {};
  equal(peekMeta(obj), undefined, 'peekMeta(obj)');
  unwatch(obj, 'somekey');
  equal(peekMeta(obj), undefined, 'peekMeta(obj)');
});
