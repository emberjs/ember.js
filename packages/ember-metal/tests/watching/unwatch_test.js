import { testBoth } from 'internal-test-helpers';
import {
  watch,
  unwatch,
  defineProperty,
  addListener,
  computed,
  set
} from '../..';

let willCount, didCount;

QUnit.module('unwatch', {
  beforeEach() {
    willCount = didCount = 0;
  }
});

function addListeners(obj, keyPath) {
  addListener(obj, keyPath + ':before', () => willCount++);
  addListener(obj, keyPath + ':change', () => didCount++);
}

testBoth('unwatching a computed property - regular get/set', function(get, set, assert) {
  let obj = {};

  defineProperty(obj, 'foo', computed({
    get() {
      return this.__foo;
    },
    set(keyName, value) {
      this.__foo = value;
      return this.__foo;
    }
  }));
  addListeners(obj, 'foo');

  watch(obj, 'foo');
  set(obj, 'foo', 'bar');
  assert.equal(willCount, 1, 'should have invoked willCount');
  assert.equal(didCount, 1, 'should have invoked didCount');

  unwatch(obj, 'foo');
  willCount = didCount = 0;
  set(obj, 'foo', 'BAZ');
  assert.equal(willCount, 0, 'should NOT have invoked willCount');
  assert.equal(didCount, 0, 'should NOT have invoked didCount');
});


testBoth('unwatching a regular property - regular get/set', function(get, set, assert) {
  let obj = { foo: 'BIFF' };
  addListeners(obj, 'foo');

  watch(obj, 'foo');
  set(obj, 'foo', 'bar');
  assert.equal(willCount, 1, 'should have invoked willCount');
  assert.equal(didCount, 1, 'should have invoked didCount');

  unwatch(obj, 'foo');
  willCount = didCount = 0;
  set(obj, 'foo', 'BAZ');
  assert.equal(willCount, 0, 'should NOT have invoked willCount');
  assert.equal(didCount, 0, 'should NOT have invoked didCount');
});

QUnit.test('unwatching should be nested', function(assert) {
  let obj = { foo: 'BIFF' };
  addListeners(obj, 'foo');

  watch(obj, 'foo');
  watch(obj, 'foo');
  set(obj, 'foo', 'bar');
  assert.equal(willCount, 1, 'should have invoked willCount');
  assert.equal(didCount, 1, 'should have invoked didCount');

  unwatch(obj, 'foo');
  willCount = didCount = 0;
  set(obj, 'foo', 'BAZ');
  assert.equal(willCount, 1, 'should NOT have invoked willCount');
  assert.equal(didCount, 1, 'should NOT have invoked didCount');

  unwatch(obj, 'foo');
  willCount = didCount = 0;
  set(obj, 'foo', 'BAZ');
  assert.equal(willCount, 0, 'should NOT have invoked willCount');
  assert.equal(didCount, 0, 'should NOT have invoked didCount');
});

testBoth('unwatching "length" property on an object', function(get, set, assert) {
  let obj = { foo: 'RUN' };
  addListeners(obj, 'length');

  // Can watch length when it is undefined
  watch(obj, 'length');
  set(obj, 'length', '10k');
  assert.equal(willCount, 1, 'should have invoked willCount');
  assert.equal(didCount, 1, 'should have invoked didCount');

  // Should stop watching despite length now being defined (making object 'array-like')
  unwatch(obj, 'length');
  willCount = didCount = 0;
  set(obj, 'length', '5k');
  assert.equal(willCount, 0, 'should NOT have invoked willCount');
  assert.equal(didCount, 0, 'should NOT have invoked didCount');
});

testBoth('unwatching should not destroy non MANDATORY_SETTER descriptor', function(get, set, assert) {
  let obj = { get foo() { return 'RUN'; } };

  assert.equal(obj.foo, 'RUN', 'obj.foo');
  watch(obj, 'foo');
  assert.equal(obj.foo, 'RUN', 'obj.foo after watch');
  unwatch(obj, 'foo');
  assert.equal(obj.foo, 'RUN', 'obj.foo after unwatch');
});
