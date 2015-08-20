import Ember from 'ember-metal/core';
import { testBoth } from 'ember-metal/tests/props_helper';
import {
  ComputedProperty,
  computed,
  cacheFor
} from 'ember-metal/computed';

import {
  Descriptor,
  defineProperty
} from 'ember-metal/properties';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import { isWatching } from 'ember-metal/watching';
import {
  addObserver,
  _addBeforeObserver
} from 'ember-metal/observer';

var obj, count;

QUnit.module('computed');

QUnit.test('computed property should be an instance of descriptor', function() {
  ok(computed(function() {}) instanceof Descriptor);
});

QUnit.test('computed properties assert the presence of a getter or setter function', function() {
  expectAssertion(function() {
    computed('nogetternorsetter', {});
  }, 'Computed properties must receive a getter or a setter, you passed none.');
});

QUnit.test('computed properties check for the presence of a function or configuration object', function() {
  expectAssertion(function() {
    computed('nolastargument');
  }, 'Ember.computed expects a function or an object as last argument.');
});

QUnit.test('computed properties defined with an object only allow `get` and `set` keys', function() {
  expectAssertion(function() {
    computed({
      get() {},
      set() {},
      other() {}
    });
  }, 'Config object pased to a Ember.computed can only contain `get` or `set` keys.');
});


QUnit.test('defining computed property should invoke property on get', function() {
  var obj = {};
  var count = 0;
  defineProperty(obj, 'foo', computed(function(key) {
    count++;
    return 'computed ' + key;
  }));

  equal(get(obj, 'foo'), 'computed foo', 'should return value');
  equal(count, 1, 'should have invoked computed property');
});

QUnit.test('defining computed property should invoke property on set', function() {
  var obj = {};
  var count = 0;
  defineProperty(obj, 'foo', computed({
    get: function(key) { return this['__' + key]; },
    set: function(key, value) {
      count++;
      this['__' + key] = 'computed ' + value;
      return this['__' + key];
    }
  }));

  equal(set(obj, 'foo', 'bar'), 'bar', 'should return set value');
  equal(count, 1, 'should have invoked computed property');
  equal(get(obj, 'foo'), 'computed bar', 'should return new value');
});

QUnit.test('defining a computed property with a dependent key ending with @each is deprecated', function() {
  expectAssertion(function() {
    computed('blazo.@each', function() { });
  }, `Depending on arrays using a dependent key ending with \`@each\` is no longer supported. Please refactor from \`Ember.computed('blazo.@each', function() {});\` to \`Ember.computed('blazo.[]', function() {})\`.`);

  expectAssertion(function() {
    computed('qux', 'zoopa.@each', function() { });
  }, `Depending on arrays using a dependent key ending with \`@each\` is no longer supported. Please refactor from \`Ember.computed('zoopa.@each', function() {});\` to \`Ember.computed('zoopa.[]', function() {})\`.`);
});

var objA, objB;
QUnit.module('computed should inherit through prototype', {
  setup() {
    objA = { __foo: 'FOO' };
    defineProperty(objA, 'foo', computed({
      get: function(key) {
        return this['__' + key];
      },
      set: function(key, value) {
        this['__' + key] = 'computed ' + value;
        return this['__' + key];
      }
    }));

    objB = Object.create(objA);
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
        return this['__' + key];
      },
      set: function(key, value) {
        this['__' + key] = 'computed ' + value;
        return this['__' + key];
      }
    }));

    objB = Object.create(objA);
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
        return this['__' + key];
      },
      set: function(key, value) {
        this['__' + key] = 'A ' + value;
        return this['__' + key];
      }
    }));

    objB = Object.create(objA);
    objB.__foo = 'FOO';
    defineProperty(objB, 'foo', computed({
      get: function(key) { return this['__' + key]; },
      set: function(key, value) {
        this['__' + key] = 'B ' + value;
        return this['__' + key];
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

QUnit.test('can set metadata on a computed property', function() {
  var computedProperty = computed(function() { });
  computedProperty.meta({ key: 'keyValue' });

  equal(computedProperty.meta().key, 'keyValue', 'saves passed meta hash to the _meta property');
});

QUnit.test('meta should return an empty hash if no meta is set', function() {
  var computedProperty = computed(function() { });
  deepEqual(computedProperty.meta(), {}, 'returned value is an empty hash');
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
      return 'bar ' + count;
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

testBoth('inherited property should not pick up cache', function(get, set) {
  var objB = Object.create(obj);

  equal(get(obj, 'foo'), 'bar 1', 'obj first get');
  equal(get(objB, 'foo'), 'bar 2', 'objB first get');

  equal(get(obj, 'foo'), 'bar 1', 'obj second get');
  equal(get(objB, 'foo'), 'bar 2', 'objB second get');

  set(obj, 'foo', 'baz'); // modify A
  equal(get(obj, 'foo'), 'bar 3', 'obj third get');
  equal(get(objB, 'foo'), 'bar 2', 'objB third get');
});

testBoth('cacheFor should return the cached value', function(get, set) {
  equal(cacheFor(obj, 'foo'), undefined, 'should not yet be a cached value');

  get(obj, 'foo');

  equal(cacheFor(obj, 'foo'), 'bar 1', 'should retrieve cached value');
});

testBoth('cacheFor should return falsy cached values', function(get, set) {
  defineProperty(obj, 'falsy', computed(function() {
    return false;
  }));

  equal(cacheFor(obj, 'falsy'), undefined, 'should not yet be a cached value');

  get(obj, 'falsy');

  equal(cacheFor(obj, 'falsy'), false, 'should retrieve cached value');
});

testBoth('setting a cached computed property passes the old value as the third argument', function(get, set) {
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
  strictEqual(receivedOldValue, undefined, 'oldValue should be undefined');

  set(obj, 'plusOne', 2);
  strictEqual(receivedOldValue, 1, 'oldValue should be 1');

  set(obj, 'plusOne', 3);
  strictEqual(receivedOldValue, 2, 'oldValue should be 2');
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
      return 'bar ' + count;
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
    return 'baz ' + count;
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
    return 'bar ' + count;
  };
  defineProperty(obj, 'bar', computed({ get: func, set: func }).property('foo'));

  defineProperty(obj, 'foo', computed(function(key) {
    count++;
    return 'foo ' + count;
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
    return 'baz ' + count;
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
    return 'foo ' + count;
  }).property('qux.{bar,baz}'));

  equal(get(obj, 'foo'), 'foo 1', 'get once');
  equal(get(obj, 'foo'), 'foo 1', 'cached retrieve');

  set(obj, 'qux', {});
  set(obj, 'qux.bar', 'bar'); // invalidate foo

  equal(get(obj, 'foo'), 'foo 2', 'foo invalidated from bar');

  set(obj, 'qux.baz', 'baz'); // invalidate foo

  equal(get(obj, 'foo'), 'foo 3', 'foo invalidated from baz');

  set(obj, 'qux.quux', 'quux'); // do not invalidate foo

  equal(get(obj, 'foo'), 'foo 3', 'foo not invalidated by quux');
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
    obj = {
      foo: {
        bar: {
          baz: {
            biff: 'BIFF'
          }
        }
      }
    };

    count = 0;
    func = function() {
      count++;
      return get(obj, 'foo.bar.baz.biff') + ' ' + count;
    };
  },

  teardown() {
    obj = count = func = null;
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

testBoth('chained dependent keys should evaluate computed properties lazily', function(get, set) {
  defineProperty(obj.foo.bar, 'b', computed(func));
  defineProperty(obj.foo, 'c', computed(function() {}).property('bar.b'));
  equal(count, 0, 'b should not run');
});

// ..........................................................
// improved-cp-syntax
//

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
        this.set('a', '' + value); // side effect
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
        ok(false, 'The getter should not be invoked');
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
  ok(found.indexOf('foo')>=0, 'should find computed property in iteration found=' + found);
  ok('foo' in obj, 'foo in obj should pass');
});

testBoth('when setting a value after it had been retrieved empty don\'t pass function UNDEFINED as oldValue', function(get, set) {
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
  _addBeforeObserver(obj, 'fullName', function () {
    fullNameWillChange++;
  });
  addObserver(obj, 'fullName', function () {
    fullNameDidChange++;
  });
  _addBeforeObserver(obj, 'firstName', function () {
    firstNameWillChange++;
  });
  addObserver(obj, 'firstName', function () {
    firstNameDidChange++;
  });
  _addBeforeObserver(obj, 'lastName', function () {
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
  _addBeforeObserver(obj, 'plusOne', function () {
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

testBoth('when setting a value on a computed property that doesn\'t handle sets', function(get, set) {
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

QUnit.test('throws assertion if called over a CP with a setter defined with the new syntax', function() {
  expectAssertion(function() {
    computed({
      get: function() { },
      set: function() { }
    }).readOnly();
  }, /Computed properties that define a setter using the new syntax cannot be read-only/);
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
