import Ember from 'ember-metal/core';
import { testBoth } from 'ember-metal/tests/props_helper';
import create from 'ember-metal/platform/create';
import {
  ComputedProperty,
  computed,
  cacheFor
} from "ember-metal/computed";

import {
  empty,
  notEmpty,
  not,
  bool,
  match,
  equal as computedEqual,
  gt,
  gte,
  lt,
  lte,
  oneWay,
  readOnly,
  defaultTo,
  deprecatingAlias,
  and,
  or,
  any,
  collect
} from "ember-metal/computed_macros";
import alias from 'ember-metal/alias';

import {
  Descriptor,
  defineProperty
} from "ember-metal/properties";
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import { isWatching } from "ember-metal/watching";
import {
  addObserver,
  addBeforeObserver
} from "ember-metal/observer";
import { indexOf } from 'ember-metal/enumerable_utils';

var originalLookup = Ember.lookup;
var obj, count, Global, lookup;

QUnit.module('computed');

QUnit.test('computed property should be an instance of descriptor', function() {
  ok(computed(function() {}) instanceof Descriptor);
});

QUnit.test('defining computed property should invoke property on get', function() {

  var obj = {};
  var count = 0;
  defineProperty(obj, 'foo', computed(function(key) {
    count++;
    return 'computed '+key;
  }));

  equal(get(obj, 'foo'), 'computed foo', 'should return value');
  equal(count, 1, 'should have invoked computed property');
});

QUnit.test('defining computed property should invoke property on set', function() {
  var obj = {};
  var count = 0;
  defineProperty(obj, 'foo', computed({
    get: function(key) { return this['__'+key]; },
    set: function(key, value) {
      count++;
      this['__'+key] = 'computed '+value;
      return this['__'+key];
    }
  }));

  equal(set(obj, 'foo', 'bar'), 'bar', 'should return set value');
  equal(count, 1, 'should have invoked computed property');
  equal(get(obj, 'foo'), 'computed bar', 'should return new value');
});

var objA, objB;
QUnit.module('computed should inherit through prototype', {
  setup() {
    objA = { __foo: 'FOO' };
    defineProperty(objA, 'foo', computed({
      get: function(key) {
        return this['__'+key];
      },
      set: function(key, value) {
        this['__'+key] = 'computed '+value;
        return this['__'+key];
      }
    }));

    objB = create(objA);
    objB.__foo = 'FOO'; // make a copy;
  },

  teardown() {
    objA = objB = null;
  }
});

testBoth('using get() and set()', function(get, set) {
  equal(get(objA, 'foo'), 'FOO', 'should get FOO from A');
  equal(get(objB, 'foo'), 'FOO', 'should get FOO from B');

  set(objA, 'foo', 'BIFF');
  equal(get(objA, 'foo'), 'computed BIFF', 'should change A');
  equal(get(objB, 'foo'), 'FOO', 'should NOT change B');

  set(objB, 'foo', 'bar');
  equal(get(objB, 'foo'), 'computed bar', 'should change B');
  equal(get(objA, 'foo'), 'computed BIFF', 'should NOT change A');

  set(objA, 'foo', 'BAZ');
  equal(get(objA, 'foo'), 'computed BAZ', 'should change A');
  equal(get(objB, 'foo'), 'computed bar', 'should NOT change B');
});

QUnit.module('redefining computed property to normal', {
  setup() {
    objA = { __foo: 'FOO' };
    defineProperty(objA, 'foo', computed({
      get: function(key) {
        return this['__'+key];
      },
      set: function(key, value) {
        this['__'+key] = 'computed '+value;
        return this['__'+key];
      }
    }));

    objB = create(objA);
    defineProperty(objB, 'foo'); // make this just a normal property.
  },

  teardown() {
    objA = objB = null;
  }
});

testBoth('using get() and set()', function(get, set) {
  equal(get(objA, 'foo'), 'FOO', 'should get FOO from A');
  equal(get(objB, 'foo'), undefined, 'should get undefined from B');

  set(objA, 'foo', 'BIFF');
  equal(get(objA, 'foo'), 'computed BIFF', 'should change A');
  equal(get(objB, 'foo'), undefined, 'should NOT change B');

  set(objB, 'foo', 'bar');
  equal(get(objB, 'foo'), 'bar', 'should change B');
  equal(get(objA, 'foo'), 'computed BIFF', 'should NOT change A');

  set(objA, 'foo', 'BAZ');
  equal(get(objA, 'foo'), 'computed BAZ', 'should change A');
  equal(get(objB, 'foo'), 'bar', 'should NOT change B');
});

QUnit.module('redefining computed property to another property', {
  setup() {
    objA = { __foo: 'FOO' };
    defineProperty(objA, 'foo', computed({
      get: function(key) {
        return this['__'+key];
      },
      set: function(key, value) {
        this['__'+key] = 'A '+value;
        return this['__'+key];
      }
    }));

    objB = create(objA);
    objB.__foo = 'FOO';
    defineProperty(objB, 'foo', computed({
      get: function(key) { return this['__'+key]; },
      set: function(key, value) {
        this['__'+key] = 'B '+value;
        return this['__'+key];
      }
    }));
  },

  teardown() {
    objA = objB = null;
  }
});

testBoth('using get() and set()', function(get, set) {
  equal(get(objA, 'foo'), 'FOO', 'should get FOO from A');
  equal(get(objB, 'foo'), 'FOO', 'should get FOO from B');

  set(objA, 'foo', 'BIFF');
  equal(get(objA, 'foo'), 'A BIFF', 'should change A');
  equal(get(objB, 'foo'), 'FOO', 'should NOT change B');

  set(objB, 'foo', 'bar');
  equal(get(objB, 'foo'), 'B bar', 'should change B');
  equal(get(objA, 'foo'), 'A BIFF', 'should NOT change A');

  set(objA, 'foo', 'BAZ');
  equal(get(objA, 'foo'), 'A BAZ', 'should change A');
  equal(get(objB, 'foo'), 'B bar', 'should NOT change B');
});

QUnit.module('computed - metadata');

QUnit.test("can set metadata on a computed property", function() {
  var computedProperty = computed(function() { });
  computedProperty.meta({ key: 'keyValue' });

  equal(computedProperty.meta().key, 'keyValue', "saves passed meta hash to the _meta property");
});

QUnit.test("meta should return an empty hash if no meta is set", function() {
  var computedProperty = computed(function() { });
  deepEqual(computedProperty.meta(), {}, "returned value is an empty hash");
});

// ..........................................................
// CACHEABLE
//

QUnit.module('computed - cacheable', {
  setup() {
    obj = {};
    count = 0;
    var func = function(key, value) {
      count++;
      return 'bar '+count;
    };
    defineProperty(obj, 'foo', computed({ get: func, set: func }));
  },

  teardown() {
    obj = count = null;
  }
});

testBoth('cacheable should cache', function(get, set) {
  equal(get(obj, 'foo'), 'bar 1', 'first get');
  equal(get(obj, 'foo'), 'bar 1', 'second get');
  equal(count, 1, 'should only invoke once');
});

testBoth('modifying a cacheable property should update cache', function(get, set) {
  equal(get(obj, 'foo'), 'bar 1', 'first get');
  equal(get(obj, 'foo'), 'bar 1', 'second get');

  equal(set(obj, 'foo', 'baz'), 'baz', 'setting');
  equal(get(obj, 'foo'), 'bar 2', 'third get');
  equal(count, 2, 'should not invoke again');
});

QUnit.test('calling cacheable() on a computed property raises a deprecation', function() {
  var cp = new ComputedProperty(function() {});
  expectDeprecation(function() {
    cp.cacheable();
  }, 'ComputedProperty.cacheable() is deprecated. All computed properties are cacheable by default.');
});

QUnit.test('passing cacheable in a the options to the CP constructor raises a deprecation', function() {
  expectDeprecation(function() {
    new ComputedProperty(function() {}, { cacheable: true });
  }, "Passing opts.cacheable to the CP constructor is deprecated. Invoke `volatile()` on the CP instead.");
});

QUnit.test('calling readOnly() on a computed property with arguments raises a deprecation', function() {
  var cp = new ComputedProperty(function() {});
  expectDeprecation(function() {
    cp.readOnly(true);
  }, 'Passing arguments to ComputedProperty.readOnly() is deprecated.');
});

QUnit.test('passing readOnly in a the options to the CP constructor raises a deprecation', function() {
  expectDeprecation(function() {
    new ComputedProperty(function() {}, { readOnly: false });
  }, "Passing opts.readOnly to the CP constructor is deprecated. All CPs are writable by default. You can invoke `readOnly()` on the CP to change this.");
});

testBoth('inherited property should not pick up cache', function(get, set) {
  var objB = create(obj);

  equal(get(obj, 'foo'), 'bar 1', 'obj first get');
  equal(get(objB, 'foo'), 'bar 2', 'objB first get');

  equal(get(obj, 'foo'), 'bar 1', 'obj second get');
  equal(get(objB, 'foo'), 'bar 2', 'objB second get');

  set(obj, 'foo', 'baz'); // modify A
  equal(get(obj, 'foo'), 'bar 3', 'obj third get');
  equal(get(objB, 'foo'), 'bar 2', 'objB third get');
});

testBoth('cacheFor should return the cached value', function(get, set) {
  equal(cacheFor(obj, 'foo'), undefined, "should not yet be a cached value");

  get(obj, 'foo');

  equal(cacheFor(obj, 'foo'), "bar 1", "should retrieve cached value");
});

testBoth('cacheFor should return falsy cached values', function(get, set) {

  defineProperty(obj, 'falsy', computed(function() {
    return false;
  }));

  equal(cacheFor(obj, 'falsy'), undefined, "should not yet be a cached value");

  get(obj, 'falsy');

  equal(cacheFor(obj, 'falsy'), false, "should retrieve cached value");
});

testBoth("setting a cached computed property passes the old value as the third argument", function(get, set) {
  var obj = {
    foo: 0
  };

  var receivedOldValue;

  defineProperty(obj, 'plusOne', computed({
    get: function() {},
    set: function(key, value, oldValue) {
      receivedOldValue = oldValue;
      return value;
    } }).property('foo')
  );

  set(obj, 'plusOne', 1);
  strictEqual(receivedOldValue, undefined, "oldValue should be undefined");

  set(obj, 'plusOne', 2);
  strictEqual(receivedOldValue, 1, "oldValue should be 1");

  set(obj, 'plusOne', 3);
  strictEqual(receivedOldValue, 2, "oldValue should be 2");
});

testBoth("the old value is only passed in if the computed property specifies three arguments", function(get, set) {
  var obj = {
    foo: 0
  };

  defineProperty(obj, 'plusOne', computed({
      get: function() {},
      set: function(key, value) {
        equal(arguments.length, 2, "computed property is only invoked with two arguments");
        return value;
      }
    }).property('foo')
  );

  set(obj, 'plusOne', 1);
  set(obj, 'plusOne', 2);
  set(obj, 'plusOne', 3);
});

// ..........................................................
// DEPENDENT KEYS
//

QUnit.module('computed - dependentkey', {
  setup() {
    obj = { bar: 'baz' };
    count = 0;
    var getterAndSetter = function(key, value) {
      count++;
      get(this, 'bar');
      return 'bar '+count;
    };
    defineProperty(obj, 'foo', computed({
      get: getterAndSetter,
      set: getterAndSetter
    }).property('bar'));
  },

  teardown() {
    obj = count = null;
  }
});

testBoth('should lazily watch dependent keys on set', function (get, set) {
  equal(isWatching(obj, 'bar'), false, 'precond not watching dependent key');
  set(obj, 'foo', 'bar');
  equal(isWatching(obj, 'bar'), true, 'lazily watching dependent key');
});

testBoth('should lazily watch dependent keys on get', function (get, set) {
  equal(isWatching(obj, 'bar'), false, 'precond not watching dependent key');
  get(obj, 'foo');
  equal(isWatching(obj, 'bar'), true, 'lazily watching dependent key');
});

testBoth('local dependent key should invalidate cache', function(get, set) {
  equal(isWatching(obj, 'bar'), false, 'precond not watching dependent key');
  equal(get(obj, 'foo'), 'bar 1', 'get once');
  equal(isWatching(obj, 'bar'), true, 'lazily setup watching dependent key');
  equal(get(obj, 'foo'), 'bar 1', 'cached retrieve');

  set(obj, 'bar', 'BIFF'); // should invalidate foo

  equal(get(obj, 'foo'), 'bar 2', 'should recache');
  equal(get(obj, 'foo'), 'bar 2', 'cached retrieve');
});

testBoth('should invalidate multiple nested dependent keys', function(get, set) {
  var count = 0;
  defineProperty(obj, 'bar', computed(function() {
    count++;
    get(this, 'baz');
    return 'baz '+count;
  }).property('baz'));

  equal(isWatching(obj, 'bar'), false, 'precond not watching dependent key');
  equal(isWatching(obj, 'baz'), false, 'precond not watching dependent key');
  equal(get(obj, 'foo'), 'bar 1', 'get once');
  equal(isWatching(obj, 'bar'), true, 'lazily setup watching dependent key');
  equal(isWatching(obj, 'baz'), true, 'lazily setup watching dependent key');
  equal(get(obj, 'foo'), 'bar 1', 'cached retrieve');

  set(obj, 'baz', 'BIFF'); // should invalidate bar -> foo
  equal(isWatching(obj, 'bar'), false, 'should not be watching dependent key after cache cleared');
  equal(isWatching(obj, 'baz'), false, 'should not be watching dependent key after cache cleared');

  equal(get(obj, 'foo'), 'bar 2', 'should recache');
  equal(get(obj, 'foo'), 'bar 2', 'cached retrieve');
  equal(isWatching(obj, 'bar'), true, 'lazily setup watching dependent key');
  equal(isWatching(obj, 'baz'), true, 'lazily setup watching dependent key');
});

testBoth('circular keys should not blow up', function(get, set) {
  var func = function(key, value) {
    count++;
    return 'bar '+count;
  };
  defineProperty(obj, 'bar', computed({ get: func, set: func }).property('foo'));

  defineProperty(obj, 'foo', computed(function(key) {
    count++;
    return 'foo '+count;
  }).property('bar'));

  equal(get(obj, 'foo'), 'foo 1', 'get once');
  equal(get(obj, 'foo'), 'foo 1', 'cached retrieve');

  set(obj, 'bar', 'BIFF'); // should invalidate bar -> foo -> bar

  equal(get(obj, 'foo'), 'foo 3', 'should recache');
  equal(get(obj, 'foo'), 'foo 3', 'cached retrieve');
});

testBoth('redefining a property should undo old dependent keys', function(get, set) {

  equal(isWatching(obj, 'bar'), false, 'precond not watching dependent key');
  equal(get(obj, 'foo'), 'bar 1');
  equal(isWatching(obj, 'bar'), true, 'lazily watching dependent key');

  defineProperty(obj, 'foo', computed(function() {
    count++;
    return 'baz '+count;
  }).property('baz'));

  equal(isWatching(obj, 'bar'), false, 'after redefining should not be watching dependent key');

  equal(get(obj, 'foo'), 'baz 2');

  set(obj, 'bar', 'BIFF'); // should not kill cache
  equal(get(obj, 'foo'), 'baz 2');

  set(obj, 'baz', 'BOP');
  equal(get(obj, 'foo'), 'baz 3');
});

testBoth('can watch multiple dependent keys specified declaratively via brace expansion', function (get, set) {
  defineProperty(obj, 'foo', computed(function(key) {
    count++;
    return 'foo '+count;
  }).property('qux.{bar,baz}'));

  equal(get(obj, 'foo'), 'foo 1', "get once");
  equal(get(obj, 'foo'), 'foo 1', "cached retrieve");

  set(obj, 'qux', {});
  set(obj, 'qux.bar', 'bar'); // invalidate foo

  equal(get(obj, 'foo'), 'foo 2', "foo invalidated from bar");

  set(obj, 'qux.baz', 'baz'); // invalidate foo

  equal(get(obj, 'foo'), 'foo 3', "foo invalidated from baz");

  set(obj, 'qux.quux', 'quux'); // do not invalidate foo

  equal(get(obj, 'foo'), 'foo 3', "foo not invalidated by quux");
});

testBoth('throws assertion if brace expansion notation has spaces', function (get, set) {
  throws(function () {
    defineProperty(obj, 'roo', computed(function (key) {
      count++;
      return 'roo ' + count;
    }).property('fee.{bar, baz,bop , }'));
  }, /cannot contain spaces/);
});

// ..........................................................
// CHAINED DEPENDENT KEYS
//


var func;
var moduleOpts = {
  setup() {
    originalLookup = Ember.lookup;
    lookup = Ember.lookup = {};

    obj = {
      foo: {
        bar: {
          baz: {
            biff: "BIFF"
          }
        }
      }
    };

    Global = {
      foo: {
        bar: {
          baz: {
            biff: "BIFF"
          }
        }
      }
    };

    lookup['Global'] = Global;

    count = 0;
    func = function() {
      count++;
      return get(obj, 'foo.bar.baz.biff')+' '+count;
    };
  },

  teardown() {
    obj = count = func = Global = null;
    Ember.lookup = originalLookup;
  }
};

QUnit.module('computed - dependentkey with chained properties', moduleOpts);

testBoth('depending on simple chain', function(get, set) {

  // assign computed property
  defineProperty(obj, 'prop',
    computed(func).property('foo.bar.baz.biff'));

  equal(get(obj, 'prop'), 'BIFF 1');

  set(get(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  equal(get(obj, 'prop'), 'BUZZ 2');
  equal(get(obj, 'prop'), 'BUZZ 2');

  set(get(obj, 'foo.bar'), 'baz', { biff: 'BLOB' });
  equal(get(obj, 'prop'), 'BLOB 3');
  equal(get(obj, 'prop'), 'BLOB 3');

  set(get(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  equal(get(obj, 'prop'), 'BUZZ 4');
  equal(get(obj, 'prop'), 'BUZZ 4');

  set(get(obj, 'foo'), 'bar', { baz: { biff: 'BOOM' } });
  equal(get(obj, 'prop'), 'BOOM 5');
  equal(get(obj, 'prop'), 'BOOM 5');

  set(get(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  equal(get(obj, 'prop'), 'BUZZ 6');
  equal(get(obj, 'prop'), 'BUZZ 6');

  set(obj, 'foo', { bar: { baz: { biff: 'BLARG' } } });
  equal(get(obj, 'prop'), 'BLARG 7');
  equal(get(obj, 'prop'), 'BLARG 7');

  set(get(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
  equal(get(obj, 'prop'), 'BUZZ 8');
  equal(get(obj, 'prop'), 'BUZZ 8');

  defineProperty(obj, 'prop');
  set(obj, 'prop', 'NONE');
  equal(get(obj, 'prop'), 'NONE');

  set(obj, 'foo', { bar: { baz: { biff: 'BLARG' } } });
  equal(get(obj, 'prop'), 'NONE'); // should do nothing
  equal(count, 8, 'should be not have invoked computed again');

});

testBoth('depending on Global chain', function(get, set) {

  // assign computed property
  defineProperty(obj, 'prop', computed(function() {
    count++;
    return get('Global.foo.bar.baz.biff')+' '+count;
  }).property('Global.foo.bar.baz.biff'));

  equal(get(obj, 'prop'), 'BIFF 1');

  set(get(Global, 'foo.bar.baz'), 'biff', 'BUZZ');
  equal(get(obj, 'prop'), 'BUZZ 2');
  equal(get(obj, 'prop'), 'BUZZ 2');

  set(get(Global, 'foo.bar'), 'baz', { biff: 'BLOB' });
  equal(get(obj, 'prop'), 'BLOB 3');
  equal(get(obj, 'prop'), 'BLOB 3');

  set(get(Global, 'foo.bar.baz'), 'biff', 'BUZZ');
  equal(get(obj, 'prop'), 'BUZZ 4');
  equal(get(obj, 'prop'), 'BUZZ 4');

  set(get(Global, 'foo'), 'bar', { baz: { biff: 'BOOM' } });
  equal(get(obj, 'prop'), 'BOOM 5');
  equal(get(obj, 'prop'), 'BOOM 5');

  set(get(Global, 'foo.bar.baz'), 'biff', 'BUZZ');
  equal(get(obj, 'prop'), 'BUZZ 6');
  equal(get(obj, 'prop'), 'BUZZ 6');

  set(Global, 'foo', { bar: { baz: { biff: 'BLARG' } } });
  equal(get(obj, 'prop'), 'BLARG 7');
  equal(get(obj, 'prop'), 'BLARG 7');

  set(get(Global, 'foo.bar.baz'), 'biff', 'BUZZ');
  equal(get(obj, 'prop'), 'BUZZ 8');
  equal(get(obj, 'prop'), 'BUZZ 8');

  defineProperty(obj, 'prop');
  set(obj, 'prop', 'NONE');
  equal(get(obj, 'prop'), 'NONE');

  set(Global, 'foo', { bar: { baz: { biff: 'BLARG' } } });
  equal(get(obj, 'prop'), 'NONE'); // should do nothing
  equal(count, 8, 'should be not have invoked computed again');

});

testBoth('chained dependent keys should evaluate computed properties lazily', function(get, set) {
  defineProperty(obj.foo.bar, 'b', computed(func));
  defineProperty(obj.foo, 'c', computed(function() {}).property('bar.b'));
  equal(count, 0, 'b should not run');
});

// ..........................................................
// improved-cp-syntax
//

if (Ember.FEATURES.isEnabled("new-computed-syntax")) {
  QUnit.module('computed - improved cp syntax');

  QUnit.test('setter and getters are passed using an object', function() {
    var testObj = Ember.Object.extend({
      a: '1',
      b: '2',
      aInt: computed('a', {
        get(keyName) {
          equal(keyName, 'aInt', 'getter receives the keyName');
          return parseInt(this.get('a'));
        },
        set(keyName, value, oldValue) {
          equal(keyName, 'aInt', 'setter receives the keyName');
          equal(value, 123, 'setter receives the new value');
          equal(oldValue, 1, 'setter receives the old value');
          this.set('a', ""+value); // side effect
          return parseInt(this.get('a'));
        }
      })
    }).create();

    ok(testObj.get('aInt') === 1, 'getter works');
    testObj.set('aInt', 123);
    ok(testObj.get('a') === '123', 'setter works');
    ok(testObj.get('aInt') === 123, 'cp has been updated too');
  });

  QUnit.test('setter can be omited', function() {
    var testObj = Ember.Object.extend({
      a: '1',
      b: '2',
      aInt: computed('a', {
        get(keyName) {
          equal(keyName, 'aInt', 'getter receives the keyName');
          return parseInt(this.get('a'));
        }
      })
    }).create();

    ok(testObj.get('aInt') === 1, 'getter works');
    ok(testObj.get('a') === '1');
    testObj.set('aInt', '123');
    ok(testObj.get('aInt') === '123', 'cp has been updated too');
  });

  QUnit.test('the return value of the setter gets cached', function() {
    var testObj = Ember.Object.extend({
      a: '1',
      sampleCP: computed('a', {
        get(keyName) {
          ok(false, "The getter should not be invoked");
          return 'get-value';
        },
        set(keyName, value, oldValue) {
          return 'set-value';
        }
      })
    }).create();

    testObj.set('sampleCP', 'abcd');
    ok(testObj.get('sampleCP') === 'set-value', 'The return value of the CP was cached');
  });

  QUnit.test('Passing a function that acts both as getter and setter is deprecated', function() {
    var regex = /Using the same function as getter and setter is deprecated/;
    expectDeprecation(function() {
      Ember.Object.extend({
        aInt: computed('a', function(keyName, value, oldValue) {})
      });
    }, regex);
  });
}

// ..........................................................
// BUGS
//

QUnit.module('computed edge cases');

QUnit.test('adding a computed property should show up in key iteration', function() {

  var obj = {};
  defineProperty(obj, 'foo', computed(function() {}));

  var found = [];
  for (var key in obj) {
    found.push(key);
  }
  ok(indexOf(found, 'foo')>=0, 'should find computed property in iteration found=' + found);
  ok('foo' in obj, 'foo in obj should pass');
});

testBoth("when setting a value after it had been retrieved empty don't pass function UNDEFINED as oldValue", function(get, set) {
  var obj = {};
  var oldValueIsNoFunction = true;

  defineProperty(obj, 'foo', computed({
    get: function() { },
    set: function(key, value, oldValue) {
      if (typeof oldValue === 'function') {
        oldValueIsNoFunction = false;
      }
      return undefined;
    }
  }));

  get(obj, 'foo');
  set(obj, 'foo', undefined);

  ok(oldValueIsNoFunction);
});

QUnit.module('computed - setter');

testBoth('setting a watched computed property', function(get, set) {
  var obj = {
    firstName: 'Yehuda',
    lastName: 'Katz'
  };
  defineProperty(obj, 'fullName', computed({
      get: function() { return get(this, 'firstName') + ' ' + get(this, 'lastName'); },
      set: function(key, value) {
        var values = value.split(' ');
        set(this, 'firstName', values[0]);
        set(this, 'lastName', values[1]);
        return value;
      }
    }).property('firstName', 'lastName')
  );
  var fullNameWillChange = 0;
  var fullNameDidChange = 0;
  var firstNameWillChange = 0;
  var firstNameDidChange = 0;
  var lastNameWillChange = 0;
  var lastNameDidChange = 0;
  addBeforeObserver(obj, 'fullName', function () {
    fullNameWillChange++;
  });
  addObserver(obj, 'fullName', function () {
    fullNameDidChange++;
  });
  addBeforeObserver(obj, 'firstName', function () {
    firstNameWillChange++;
  });
  addObserver(obj, 'firstName', function () {
    firstNameDidChange++;
  });
  addBeforeObserver(obj, 'lastName', function () {
    lastNameWillChange++;
  });
  addObserver(obj, 'lastName', function () {
    lastNameDidChange++;
  });

  equal(get(obj, 'fullName'), 'Yehuda Katz');

  set(obj, 'fullName', 'Yehuda Katz');

  set(obj, 'fullName', 'Kris Selden');

  equal(get(obj, 'fullName'), 'Kris Selden');
  equal(get(obj, 'firstName'), 'Kris');
  equal(get(obj, 'lastName'), 'Selden');

  equal(fullNameWillChange, 1);
  equal(fullNameDidChange, 1);
  equal(firstNameWillChange, 1);
  equal(firstNameDidChange, 1);
  equal(lastNameWillChange, 1);
  equal(lastNameDidChange, 1);
});

testBoth('setting a cached computed property that modifies the value you give it', function(get, set) {
  var obj = {
    foo: 0
  };
  defineProperty(obj, 'plusOne', computed({
      get: function(key) { return get(this, 'foo') + 1; },
      set: function(key, value) {
        set(this, 'foo', value);
        return value + 1;
      }
    }).property('foo')
  );
  var plusOneWillChange = 0;
  var plusOneDidChange = 0;
  addBeforeObserver(obj, 'plusOne', function () {
    plusOneWillChange++;
  });
  addObserver(obj, 'plusOne', function () {
    plusOneDidChange++;
  });

  equal(get(obj, 'plusOne'), 1);
  set(obj, 'plusOne', 1);
  equal(get(obj, 'plusOne'), 2);
  set(obj, 'plusOne', 1);
  equal(get(obj, 'plusOne'), 2);

  equal(plusOneWillChange, 1);
  equal(plusOneDidChange, 1);

  set(obj, 'foo', 5);
  equal(get(obj, 'plusOne'), 6);

  equal(plusOneWillChange, 2);
  equal(plusOneDidChange, 2);
});

QUnit.module('computed - default setter');

testBoth("when setting a value on a computed property that doesn't handle sets", function(get, set) {
  var obj = {};
  var observerFired = false;

  defineProperty(obj, 'foo', computed(function() {
    return 'foo';
  }));

  addObserver(obj, 'foo', null, function() {
    observerFired = true;
  });

  set(obj, 'foo', 'bar');

  equal(get(obj, 'foo'), 'bar', 'The set value is properly returned');
  ok(typeof obj.foo === 'string', 'The computed property was removed');
  ok(observerFired, 'The observer was still notified');
});

QUnit.module('computed - readOnly');

QUnit.test('is chainable', function() {
  var cp = computed(function() {}).readOnly();

  ok(cp instanceof Descriptor);
  ok(cp instanceof ComputedProperty);
});

QUnit.test('throws assertion if called over a CP with a setter', function() {
  expectAssertion(function() {
    computed({
      get: function() { },
      set: function() { }
    }).readOnly();
  }, /Computed properties that define a setter cannot be read-only/);
});

testBoth('protects against setting', function(get, set) {
  var obj = {  };

  defineProperty(obj, 'bar', computed(function(key) {
    return 'barValue';
  }).readOnly());

  equal(get(obj, 'bar'), 'barValue');

  throws(function() {
    set(obj, 'bar', 'newBar');
  }, /Cannot set read\-only property "bar" on object:/ );

  equal(get(obj, 'bar'), 'barValue');
});

QUnit.module('CP macros');

testBoth('computed.not', function(get, set) {
  var obj = { foo: true };
  defineProperty(obj, 'notFoo', not('foo'));
  equal(get(obj, 'notFoo'), false);

  obj = { foo: { bar: true } };
  defineProperty(obj, 'notFoo', not('foo.bar'));
  equal(get(obj, 'notFoo'), false);
});

testBoth('computed.empty', function(get, set) {
  var obj = { foo: [], bar: undefined, baz: null, quz: '' };
  defineProperty(obj, 'fooEmpty', empty('foo'));
  defineProperty(obj, 'barEmpty', empty('bar'));
  defineProperty(obj, 'bazEmpty', empty('baz'));
  defineProperty(obj, 'quzEmpty', empty('quz'));

  equal(get(obj, 'fooEmpty'), true);
  set(obj, 'foo', [1]);
  equal(get(obj, 'fooEmpty'), false);
  equal(get(obj, 'barEmpty'), true);
  equal(get(obj, 'bazEmpty'), true);
  equal(get(obj, 'quzEmpty'), true);
  set(obj, 'quz', 'asdf');
  equal(get(obj, 'quzEmpty'), false);
});

testBoth('computed.bool', function(get, set) {
  var obj = { foo() {}, bar: 'asdf', baz: null, quz: false };
  defineProperty(obj, 'fooBool', bool('foo'));
  defineProperty(obj, 'barBool', bool('bar'));
  defineProperty(obj, 'bazBool', bool('baz'));
  defineProperty(obj, 'quzBool', bool('quz'));
  equal(get(obj, 'fooBool'), true);
  equal(get(obj, 'barBool'), true);
  equal(get(obj, 'bazBool'), false);
  equal(get(obj, 'quzBool'), false);
});

testBoth('computed.alias', function(get, set) {
  var obj = { bar: 'asdf', baz: null, quz: false };
  defineProperty(obj, 'bay', computed(function(key) {
    return 'apple';
  }));

  defineProperty(obj, 'barAlias', alias('bar'));
  defineProperty(obj, 'bazAlias', alias('baz'));
  defineProperty(obj, 'quzAlias', alias('quz'));
  defineProperty(obj, 'bayAlias', alias('bay'));

  equal(get(obj, 'barAlias'), 'asdf');
  equal(get(obj, 'bazAlias'), null);
  equal(get(obj, 'quzAlias'), false);
  equal(get(obj, 'bayAlias'), 'apple');

  set(obj, 'barAlias', 'newBar');
  set(obj, 'bazAlias', 'newBaz');
  set(obj, 'quzAlias', null);

  equal(get(obj, 'barAlias'), 'newBar');
  equal(get(obj, 'bazAlias'), 'newBaz');
  equal(get(obj, 'quzAlias'), null);

  equal(get(obj, 'bar'), 'newBar');
  equal(get(obj, 'baz'), 'newBaz');
  equal(get(obj, 'quz'), null);
});

testBoth('computed.alias set', function(get, set) {
  var obj = {};
  var constantValue = 'always `a`';

  defineProperty(obj, 'original', computed({
    get: function(key) { return constantValue; },
    set: function(key, value) { return constantValue; }
  }));
  defineProperty(obj, 'aliased', alias('original'));

  equal(get(obj, 'original'), constantValue);
  equal(get(obj, 'aliased'), constantValue);

  set(obj, 'aliased', 'should not set to this value');

  equal(get(obj, 'original'), constantValue);
  equal(get(obj, 'aliased'), constantValue);
});

testBoth('computed.defaultTo', function(get, set) {
  expect(6);

  var obj = { source: 'original source value' };
  defineProperty(obj, 'copy', defaultTo('source'));

  ignoreDeprecation(function() {
    equal(get(obj, 'copy'), 'original source value');

    set(obj, 'copy', 'new copy value');
    equal(get(obj, 'source'), 'original source value');
    equal(get(obj, 'copy'), 'new copy value');

    set(obj, 'source', 'new source value');
    equal(get(obj, 'copy'), 'new copy value');

    set(obj, 'copy', null);
    equal(get(obj, 'copy'), 'new source value');
  });

  expectDeprecation(function() {
    var obj = { source: 'original source value' };
    defineProperty(obj, 'copy', defaultTo('source'));

    get(obj, 'copy');
  }, 'Usage of Ember.computed.defaultTo is deprecated, use `Ember.computed.oneWay` instead.');
});

testBoth('computed.match', function(get, set) {
  var obj = { name: 'Paul' };
  defineProperty(obj, 'isPaul', match('name', /Paul/));

  equal(get(obj, 'isPaul'), true, 'is Paul');

  set(obj, 'name', 'Pierre');

  equal(get(obj, 'isPaul'), false, 'is not Paul anymore');
});

testBoth('computed.notEmpty', function(get, set) {
  var obj = { items: [1] };
  defineProperty(obj, 'hasItems', notEmpty('items'));

  equal(get(obj, 'hasItems'), true, 'is not empty');

  set(obj, 'items', []);

  equal(get(obj, 'hasItems'), false, 'is empty');
});

testBoth('computed.equal', function(get, set) {
  var obj = { name: 'Paul' };
  defineProperty(obj, 'isPaul', computedEqual('name', 'Paul'));

  equal(get(obj, 'isPaul'), true, 'is Paul');

  set(obj, 'name', 'Pierre');

  equal(get(obj, 'isPaul'), false, 'is not Paul anymore');
});

testBoth('computed.gt', function(get, set) {
  var obj = { number: 2 };
  defineProperty(obj, 'isGreaterThenOne', gt('number', 1));

  equal(get(obj, 'isGreaterThenOne'), true, 'is gt');

  set(obj, 'number', 1);

  equal(get(obj, 'isGreaterThenOne'), false, 'is not gt');

  set(obj, 'number', 0);

  equal(get(obj, 'isGreaterThenOne'), false, 'is not gt');
});

testBoth('computed.gte', function(get, set) {
  var obj = { number: 2 };
  defineProperty(obj, 'isGreaterOrEqualThenOne', gte('number', 1));

  equal(get(obj, 'isGreaterOrEqualThenOne'), true, 'is gte');

  set(obj, 'number', 1);

  equal(get(obj, 'isGreaterOrEqualThenOne'), true, 'is gte');

  set(obj, 'number', 0);

  equal(get(obj, 'isGreaterOrEqualThenOne'), false, 'is not gte');
});

testBoth('computed.lt', function(get, set) {
  var obj = { number: 0 };
  defineProperty(obj, 'isLesserThenOne', lt('number', 1));

  equal(get(obj, 'isLesserThenOne'), true, 'is lt');

  set(obj, 'number', 1);

  equal(get(obj, 'isLesserThenOne'), false, 'is not lt');

  set(obj, 'number', 2);

  equal(get(obj, 'isLesserThenOne'), false, 'is not lt');
});

testBoth('computed.lte', function(get, set) {
  var obj = { number: 0 };
  defineProperty(obj, 'isLesserOrEqualThenOne', lte('number', 1));

  equal(get(obj, 'isLesserOrEqualThenOne'), true, 'is lte');

  set(obj, 'number', 1);

  equal(get(obj, 'isLesserOrEqualThenOne'), true, 'is lte');

  set(obj, 'number', 2);

  equal(get(obj, 'isLesserOrEqualThenOne'), false, 'is not lte');
});

testBoth('computed.and', function(get, set) {
  var obj = { one: true, two: true };
  defineProperty(obj, 'oneAndTwo', and('one', 'two'));

  equal(get(obj, 'oneAndTwo'), true, 'one and two');

  set(obj, 'one', false);

  equal(get(obj, 'oneAndTwo'), false, 'one and not two');

  set(obj, 'one', true);
  set(obj, 'two', 2);

  equal(get(obj, 'oneAndTwo'), 2, 'returns truthy value as in &&');
});

testBoth('computed.or', function(get, set) {
  var obj = { one: true, two: true };
  defineProperty(obj, 'oneOrTwo', or('one', 'two'));

  equal(get(obj, 'oneOrTwo'), true, 'one or two');

  set(obj, 'one', false);

  equal(get(obj, 'oneOrTwo'), true, 'one or two');

  set(obj, 'two', false);

  equal(get(obj, 'oneOrTwo'), false, 'nore one nore two');

  set(obj, 'two', true);

  equal(get(obj, 'oneOrTwo'), true, 'one or two');

  set(obj, 'one', 1);

  equal(get(obj, 'oneOrTwo'), 1, 'returns truthy value as in ||');
});

testBoth('computed.any', function(get, set) {
  var obj = { one: 'foo', two: 'bar' };
  defineProperty(obj, 'anyOf', any('one', 'two'));

  equal(get(obj, 'anyOf'), 'foo', 'is foo');

  set(obj, 'one', false);

  equal(get(obj, 'anyOf'), 'bar', 'is bar');
});

testBoth('computed.collect', function(get, set) {
  var obj = { one: 'foo', two: 'bar', three: null };
  defineProperty(obj, 'all', collect('one', 'two', 'three', 'four'));

  deepEqual(get(obj, 'all'), ['foo', 'bar', null, null], 'have all of them');

  set(obj, 'four', true);

  deepEqual(get(obj, 'all'), ['foo', 'bar', null, true], 'have all of them');

  var a = [];
  set(obj, 'one', 0);
  set(obj, 'three', a);

  deepEqual(get(obj, 'all'), [0, 'bar', a, true], 'have all of them');
});

testBoth('computed.oneWay', function(get, set) {
  var obj = {
    firstName: 'Teddy',
    lastName: 'Zeenny'
  };

  defineProperty(obj, 'nickName', oneWay('firstName'));

  equal(get(obj, 'firstName'), 'Teddy');
  equal(get(obj, 'lastName'), 'Zeenny');
  equal(get(obj, 'nickName'), 'Teddy');

  set(obj, 'nickName', 'TeddyBear');

  equal(get(obj, 'firstName'), 'Teddy');
  equal(get(obj, 'lastName'), 'Zeenny');

  equal(get(obj, 'nickName'), 'TeddyBear');

  set(obj, 'firstName', 'TEDDDDDDDDYYY');

  equal(get(obj, 'nickName'), 'TeddyBear');
});

testBoth('computed.readOnly', function(get, set) {
  var obj = {
    firstName: 'Teddy',
    lastName: 'Zeenny'
  };

  defineProperty(obj, 'nickName', readOnly('firstName'));

  equal(get(obj, 'firstName'), 'Teddy');
  equal(get(obj, 'lastName'), 'Zeenny');
  equal(get(obj, 'nickName'), 'Teddy');

  throws(function() {
    set(obj, 'nickName', 'TeddyBear');
  }, / /);

  equal(get(obj, 'firstName'), 'Teddy');
  equal(get(obj, 'lastName'), 'Zeenny');

  equal(get(obj, 'nickName'), 'Teddy');

  set(obj, 'firstName', 'TEDDDDDDDDYYY');

  equal(get(obj, 'nickName'), 'TEDDDDDDDDYYY');
});

testBoth('computed.deprecatingAlias', function(get, set) {
  var obj = { bar: 'asdf', baz: null, quz: false };
  defineProperty(obj, 'bay', computed(function(key) {
    return 'apple';
  }));

  defineProperty(obj, 'barAlias', deprecatingAlias('bar'));
  defineProperty(obj, 'bazAlias', deprecatingAlias('baz'));
  defineProperty(obj, 'quzAlias', deprecatingAlias('quz'));
  defineProperty(obj, 'bayAlias', deprecatingAlias('bay'));

  expectDeprecation(function() {
    equal(get(obj, 'barAlias'), 'asdf');
  }, 'Usage of `barAlias` is deprecated, use `bar` instead.');

  expectDeprecation(function() {
    equal(get(obj, 'bazAlias'), null);
  }, 'Usage of `bazAlias` is deprecated, use `baz` instead.');

  expectDeprecation(function() {
    equal(get(obj, 'quzAlias'), false);
  }, 'Usage of `quzAlias` is deprecated, use `quz` instead.');

  expectDeprecation(function() {
    equal(get(obj, 'bayAlias'), 'apple');
  }, 'Usage of `bayAlias` is deprecated, use `bay` instead.');

  expectDeprecation(function() {
    set(obj, 'barAlias', 'newBar');
  }, 'Usage of `barAlias` is deprecated, use `bar` instead.');

  expectDeprecation(function() {
    set(obj, 'bazAlias', 'newBaz');
  }, 'Usage of `bazAlias` is deprecated, use `baz` instead.');

  expectDeprecation(function() {
    set(obj, 'quzAlias', null);
  }, 'Usage of `quzAlias` is deprecated, use `quz` instead.');


  equal(get(obj, 'barAlias'), 'newBar');
  equal(get(obj, 'bazAlias'), 'newBaz');
  equal(get(obj, 'quzAlias'), null);

  equal(get(obj, 'bar'), 'newBar');
  equal(get(obj, 'baz'), 'newBaz');
  equal(get(obj, 'quz'), null);
});
