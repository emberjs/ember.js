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
  setup() {
    willCount = didCount = 0;
  }
});

function addListeners(obj, keyPath) {
  addListener(obj, keyPath + ':before', () => willCount++);
  addListener(obj, keyPath + ':change', () => didCount++);
}

testBoth('unwatching a computed property - regular get/set', function(get, set) {
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
  equal(willCount, 1, 'should have invoked willCount');
  equal(didCount, 1, 'should have invoked didCount');

  unwatch(obj, 'foo');
  willCount = didCount = 0;
  set(obj, 'foo', 'BAZ');
  equal(willCount, 0, 'should NOT have invoked willCount');
  equal(didCount, 0, 'should NOT have invoked didCount');
});


testBoth('unwatching a regular property - regular get/set', function(get, set) {
  let obj = { foo: 'BIFF' };
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
  let obj = { foo: 'BIFF' };
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
  let obj = { foo: 'RUN' };
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

testBoth('unwatching should not destroy non MANDATORY_SETTER descriptor', function(get, set) {
  let obj = { get foo() { return 'RUN'; } };

  equal(obj.foo, 'RUN', 'obj.foo');
  watch(obj, 'foo');
  equal(obj.foo, 'RUN', 'obj.foo after watch');
  unwatch(obj, 'foo');
  equal(obj.foo, 'RUN', 'obj.foo after unwatch');
});

test("unwatching capitalized property name", function() {
  var obj = { Foo: "bar" };
  addListeners(obj, 'Foo');

  watch(obj, 'Foo');

  set(obj, 'Foo', 'FOO');
  equal(willCount, 1, 'should have invoked willCount');
  equal(didCount, 1, 'should have invoked didCount');

  unwatch(obj, 'Foo');
  willCount = didCount = 0;
  set(obj, 'Foo', 'BAR');
  equal(willCount, 0, 'should NOT have invoked willCount');
  equal(didCount, 0, 'should NOT have invoked didCount');

});

test("unwatching a chain", function() {
  var Bar = {};
  var obj = { foo: Bar };
  addListeners(obj, 'foo.Bar');

  watch(obj, 'foo.Bar');

  set(obj, 'foo.Bar', 'FOOBAR');
  equal(willCount, 1, 'should have invoked willCount');
  equal(didCount, 1, 'should have invoked didCount');

  unwatch(obj, 'foo.Bar');
  willCount = didCount = 0;
  set(obj, 'foo.Bar', 'BARFOO');
  equal(willCount, 0, 'should NOT have invoked willCount');
  equal(didCount, 0, 'should NOT have invoked didCount');

});

test("unwatching a chain with capitalize property names", function() {
  var Bar = {};
  var obj = { Foo: Bar };
  addListeners(obj, 'Foo.Bar');

  watch(obj, 'Foo.Bar');

  set(obj, 'Foo.Bar', 'FOOBAR');
  equal(willCount, 1, 'should have invoked willCount');
  equal(didCount, 1, 'should have invoked didCount');

  unwatch(obj, 'Foo.Bar');
  willCount = didCount = 0;
  set(obj, 'Foo.Bar', 'BARFOO');
  equal(willCount, 0, 'should NOT have invoked willCount');
  equal(didCount, 0, 'should NOT have invoked didCount');

});
