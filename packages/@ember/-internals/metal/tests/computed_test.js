import { Object as EmberObject } from '@ember/-internals/runtime';
import {
  ComputedProperty,
  computed,
  getCachedValueFor,
  Descriptor,
  defineProperty,
  get,
  set,
  isWatching,
  addObserver,
} from '..';
import { meta as metaFor } from '@ember/-internals/meta';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

let obj, count;

moduleFor(
  'computed',
  class extends AbstractTestCase {
    ['@test computed property should be an instance of descriptor'](assert) {
      assert.ok(computed(function() {}) instanceof Descriptor);
    }

    ['@test computed properties assert the presence of a getter or setter function']() {
      expectAssertion(function() {
        computed('nogetternorsetter', {});
      }, 'Computed properties must receive a getter or a setter, you passed none.');
    }

    ['@test computed properties check for the presence of a function or configuration object']() {
      expectAssertion(function() {
        computed('nolastargument');
      }, 'computed expects a function or an object as last argument.');
    }

    ['@test computed properties defined with an object only allow `get` and `set` keys']() {
      expectAssertion(function() {
        computed({
          get() {},
          set() {},
          other() {},
        });
      }, 'Config object passed to computed can only contain `get` and `set` keys.');
    }

    ['@test computed property can be accessed without `get`'](assert) {
      let obj = {};
      let count = 0;
      defineProperty(
        obj,
        'foo',
        computed(function(key) {
          count++;
          return 'computed ' + key;
        })
      );

      assert.equal(obj.foo, 'computed foo', 'should return value');
      assert.equal(count, 1, 'should have invoked computed property');
    }

    ['@test defining computed property should invoke property on get'](assert) {
      let obj = {};
      let count = 0;
      defineProperty(
        obj,
        'foo',
        computed(function(key) {
          count++;
          return 'computed ' + key;
        })
      );

      assert.equal(get(obj, 'foo'), 'computed foo', 'should return value');
      assert.equal(count, 1, 'should have invoked computed property');
    }

    ['@test defining computed property should invoke property on set'](assert) {
      let obj = {};
      let count = 0;
      defineProperty(
        obj,
        'foo',
        computed({
          get(key) {
            return this['__' + key];
          },
          set(key, value) {
            count++;
            this['__' + key] = 'computed ' + value;
            return this['__' + key];
          },
        })
      );

      assert.equal(set(obj, 'foo', 'bar'), 'bar', 'should return set value');
      assert.equal(count, 1, 'should have invoked computed property');
      assert.equal(get(obj, 'foo'), 'computed bar', 'should return new value');
    }

    ['@test defining a computed property with a dependent key ending with @each is expanded to []'](
      assert
    ) {
      let cp = computed('blazo.@each', function() {});

      assert.deepEqual(cp._dependentKeys, ['blazo.[]']);

      cp = computed('qux', 'zoopa.@each', function() {});

      assert.deepEqual(cp._dependentKeys, ['qux', 'zoopa.[]']);
    }

    ['@test defining a computed property with a dependent key more than one level deep beyond @each is not supported']() {
      expectNoWarning(() => {
        computed('todos', () => {});
      });

      expectNoWarning(() => {
        computed('todos.@each.owner', () => {});
      });

      expectWarning(() => {
        computed('todos.@each.owner.name', () => {});
      }, /You used the key "todos\.@each\.owner\.name" which is invalid\. /);

      expectWarning(() => {
        computed('todos.@each.owner.@each.name', () => {});
      }, /You used the key "todos\.@each\.owner\.@each\.name" which is invalid\. /);
    }
  }
);

let objA, objB;
moduleFor(
  'computed should inherit through prototype',
  class extends AbstractTestCase {
    beforeEach() {
      objA = { __foo: 'FOO' };
      defineProperty(
        objA,
        'foo',
        computed({
          get(key) {
            return this['__' + key];
          },
          set(key, value) {
            this['__' + key] = 'computed ' + value;
            return this['__' + key];
          },
        })
      );

      objB = Object.create(objA);
      objB.__foo = 'FOO'; // make a copy;
    }

    afterEach() {
      objA = objB = null;
    }

    ['@test using get() and set()'](assert) {
      assert.equal(get(objA, 'foo'), 'FOO', 'should get FOO from A');
      assert.equal(get(objB, 'foo'), 'FOO', 'should get FOO from B');

      set(objA, 'foo', 'BIFF');
      assert.equal(get(objA, 'foo'), 'computed BIFF', 'should change A');
      assert.equal(get(objB, 'foo'), 'FOO', 'should NOT change B');

      set(objB, 'foo', 'bar');
      assert.equal(get(objB, 'foo'), 'computed bar', 'should change B');
      assert.equal(get(objA, 'foo'), 'computed BIFF', 'should NOT change A');

      set(objA, 'foo', 'BAZ');
      assert.equal(get(objA, 'foo'), 'computed BAZ', 'should change A');
      assert.equal(get(objB, 'foo'), 'computed bar', 'should NOT change B');
    }
  }
);

moduleFor(
  'redefining computed property to normal',
  class extends AbstractTestCase {
    beforeEach() {
      objA = { __foo: 'FOO' };
      defineProperty(
        objA,
        'foo',
        computed({
          get(key) {
            return this['__' + key];
          },
          set(key, value) {
            this['__' + key] = 'computed ' + value;
            return this['__' + key];
          },
        })
      );

      objB = Object.create(objA);
      defineProperty(objB, 'foo'); // make this just a normal property.
    }

    afterEach() {
      objA = objB = null;
    }

    ['@test using get() and set()'](assert) {
      assert.equal(get(objA, 'foo'), 'FOO', 'should get FOO from A');
      assert.equal(get(objB, 'foo'), undefined, 'should get undefined from B');

      set(objA, 'foo', 'BIFF');
      assert.equal(get(objA, 'foo'), 'computed BIFF', 'should change A');
      assert.equal(get(objB, 'foo'), undefined, 'should NOT change B');

      set(objB, 'foo', 'bar');
      assert.equal(get(objB, 'foo'), 'bar', 'should change B');
      assert.equal(get(objA, 'foo'), 'computed BIFF', 'should NOT change A');

      set(objA, 'foo', 'BAZ');
      assert.equal(get(objA, 'foo'), 'computed BAZ', 'should change A');
      assert.equal(get(objB, 'foo'), 'bar', 'should NOT change B');
    }
  }
);

moduleFor(
  'redefining computed property to another property',
  class extends AbstractTestCase {
    beforeEach() {
      objA = { __foo: 'FOO' };
      defineProperty(
        objA,
        'foo',
        computed({
          get(key) {
            return this['__' + key];
          },
          set(key, value) {
            this['__' + key] = 'A ' + value;
            return this['__' + key];
          },
        })
      );

      objB = Object.create(objA);
      objB.__foo = 'FOO';
      defineProperty(
        objB,
        'foo',
        computed({
          get(key) {
            return this['__' + key];
          },
          set(key, value) {
            this['__' + key] = 'B ' + value;
            return this['__' + key];
          },
        })
      );
    }

    afterEach() {
      objA = objB = null;
    }

    ['@test using get() and set()'](assert) {
      assert.equal(get(objA, 'foo'), 'FOO', 'should get FOO from A');
      assert.equal(get(objB, 'foo'), 'FOO', 'should get FOO from B');

      set(objA, 'foo', 'BIFF');
      assert.equal(get(objA, 'foo'), 'A BIFF', 'should change A');
      assert.equal(get(objB, 'foo'), 'FOO', 'should NOT change B');

      set(objB, 'foo', 'bar');
      assert.equal(get(objB, 'foo'), 'B bar', 'should change B');
      assert.equal(get(objA, 'foo'), 'A BIFF', 'should NOT change A');

      set(objA, 'foo', 'BAZ');
      assert.equal(get(objA, 'foo'), 'A BAZ', 'should change A');
      assert.equal(get(objB, 'foo'), 'B bar', 'should NOT change B');
    }
  }
);

moduleFor(
  'computed - metadata',
  class extends AbstractTestCase {
    ['@test can set metadata on a computed property'](assert) {
      let computedProperty = computed(function() {});
      computedProperty.meta({ key: 'keyValue' });

      assert.equal(
        computedProperty.meta().key,
        'keyValue',
        'saves passed meta hash to the _meta property'
      );
    }

    ['@test meta should return an empty hash if no meta is set'](assert) {
      let computedProperty = computed(function() {});
      assert.deepEqual(computedProperty.meta(), {}, 'returned value is an empty hash');
    }
  }
);

// ..........................................................
// CACHEABLE
//

moduleFor(
  'computed - cacheable',
  class extends AbstractTestCase {
    beforeEach() {
      obj = {};
      count = 0;
      let func = function() {
        count++;
        return 'bar ' + count;
      };
      defineProperty(obj, 'foo', computed({ get: func, set: func }));
    }

    afterEach() {
      obj = count = null;
    }
    ['@test cacheable should cache'](assert) {
      assert.equal(get(obj, 'foo'), 'bar 1', 'first get');
      assert.equal(get(obj, 'foo'), 'bar 1', 'second get');
      assert.equal(count, 1, 'should only invoke once');
    }

    ['@test modifying a cacheable property should update cache'](assert) {
      assert.equal(get(obj, 'foo'), 'bar 1', 'first get');
      assert.equal(get(obj, 'foo'), 'bar 1', 'second get');

      assert.equal(set(obj, 'foo', 'baz'), 'baz', 'setting');
      assert.equal(get(obj, 'foo'), 'bar 2', 'third get');
      assert.equal(count, 2, 'should not invoke again');
    }

    ['@test inherited property should not pick up cache'](assert) {
      let objB = Object.create(obj);

      assert.equal(get(obj, 'foo'), 'bar 1', 'obj first get');
      assert.equal(get(objB, 'foo'), 'bar 2', 'objB first get');

      assert.equal(get(obj, 'foo'), 'bar 1', 'obj second get');
      assert.equal(get(objB, 'foo'), 'bar 2', 'objB second get');

      set(obj, 'foo', 'baz'); // modify A
      assert.equal(get(obj, 'foo'), 'bar 3', 'obj third get');
      assert.equal(get(objB, 'foo'), 'bar 2', 'objB third get');
    }

    ['@test getCachedValueFor should return the cached value'](assert) {
      assert.equal(getCachedValueFor(obj, 'foo'), undefined, 'should not yet be a cached value');

      get(obj, 'foo');

      assert.equal(getCachedValueFor(obj, 'foo'), 'bar 1', 'should retrieve cached value');
    }

    ['@test getCachedValueFor should return falsy cached values'](assert) {
      defineProperty(
        obj,
        'falsy',
        computed(function() {
          return false;
        })
      );

      assert.equal(getCachedValueFor(obj, 'falsy'), undefined, 'should not yet be a cached value');

      get(obj, 'falsy');

      assert.equal(getCachedValueFor(obj, 'falsy'), false, 'should retrieve cached value');
    }

    ['@test setting a cached computed property passes the old value as the third argument'](
      assert
    ) {
      let obj = {
        foo: 0,
      };

      let receivedOldValue;

      defineProperty(
        obj,
        'plusOne',
        computed({
          get() {},
          set(key, value, oldValue) {
            receivedOldValue = oldValue;
            return value;
          },
        }).property('foo')
      );

      set(obj, 'plusOne', 1);
      assert.strictEqual(receivedOldValue, undefined, 'oldValue should be undefined');

      set(obj, 'plusOne', 2);
      assert.strictEqual(receivedOldValue, 1, 'oldValue should be 1');

      set(obj, 'plusOne', 3);
      assert.strictEqual(receivedOldValue, 2, 'oldValue should be 2');
    }
  }
);

// ..........................................................
// DEPENDENT KEYS
//

moduleFor(
  'computed - dependentkey',
  class extends AbstractTestCase {
    beforeEach() {
      obj = { bar: 'baz' };
      count = 0;
      let getterAndSetter = function() {
        count++;
        get(this, 'bar');
        return 'bar ' + count;
      };
      defineProperty(
        obj,
        'foo',
        computed({
          get: getterAndSetter,
          set: getterAndSetter,
        }).property('bar')
      );
    }

    afterEach() {
      obj = count = null;
    }

    ['@test should lazily watch dependent keys on set'](assert) {
      assert.equal(isWatching(obj, 'bar'), false, 'precond not watching dependent key');
      set(obj, 'foo', 'bar');
      assert.equal(isWatching(obj, 'bar'), true, 'lazily watching dependent key');
    }

    ['@test should lazily watch dependent keys on get'](assert) {
      assert.equal(isWatching(obj, 'bar'), false, 'precond not watching dependent key');
      get(obj, 'foo');
      assert.equal(isWatching(obj, 'bar'), true, 'lazily watching dependent key');
    }

    ['@test local dependent key should invalidate cache'](assert) {
      assert.equal(isWatching(obj, 'bar'), false, 'precond not watching dependent key');
      assert.equal(get(obj, 'foo'), 'bar 1', 'get once');
      assert.equal(isWatching(obj, 'bar'), true, 'lazily setup watching dependent key');
      assert.equal(get(obj, 'foo'), 'bar 1', 'cached retrieve');

      set(obj, 'bar', 'BIFF'); // should invalidate foo

      assert.equal(get(obj, 'foo'), 'bar 2', 'should recache');
      assert.equal(get(obj, 'foo'), 'bar 2', 'cached retrieve');
    }

    ['@test should invalidate multiple nested dependent keys'](assert) {
      let count = 0;
      defineProperty(
        obj,
        'bar',
        computed(function() {
          count++;
          get(this, 'baz');
          return 'baz ' + count;
        }).property('baz')
      );

      assert.equal(isWatching(obj, 'bar'), false, 'precond not watching dependent key');
      assert.equal(isWatching(obj, 'baz'), false, 'precond not watching dependent key');
      assert.equal(get(obj, 'foo'), 'bar 1', 'get once');
      assert.equal(isWatching(obj, 'bar'), true, 'lazily setup watching dependent key');
      assert.equal(isWatching(obj, 'baz'), true, 'lazily setup watching dependent key');
      assert.equal(get(obj, 'foo'), 'bar 1', 'cached retrieve');

      set(obj, 'baz', 'BIFF'); // should invalidate bar -> foo
      assert.equal(
        isWatching(obj, 'bar'),
        false,
        'should not be watching dependent key after cache cleared'
      );
      assert.equal(
        isWatching(obj, 'baz'),
        false,
        'should not be watching dependent key after cache cleared'
      );

      assert.equal(get(obj, 'foo'), 'bar 2', 'should recache');
      assert.equal(get(obj, 'foo'), 'bar 2', 'cached retrieve');
      assert.equal(isWatching(obj, 'bar'), true, 'lazily setup watching dependent key');
      assert.equal(isWatching(obj, 'baz'), true, 'lazily setup watching dependent key');
    }

    ['@test circular keys should not blow up'](assert) {
      let func = function() {
        count++;
        return 'bar ' + count;
      };
      defineProperty(obj, 'bar', computed({ get: func, set: func }).property('foo'));

      defineProperty(
        obj,
        'foo',
        computed(function() {
          count++;
          return 'foo ' + count;
        }).property('bar')
      );

      assert.equal(get(obj, 'foo'), 'foo 1', 'get once');
      assert.equal(get(obj, 'foo'), 'foo 1', 'cached retrieve');

      set(obj, 'bar', 'BIFF'); // should invalidate bar -> foo -> bar

      assert.equal(get(obj, 'foo'), 'foo 3', 'should recache');
      assert.equal(get(obj, 'foo'), 'foo 3', 'cached retrieve');
    }

    ['@test redefining a property should undo old dependent keys'](assert) {
      assert.equal(isWatching(obj, 'bar'), false, 'precond not watching dependent key');
      assert.equal(get(obj, 'foo'), 'bar 1');
      assert.equal(isWatching(obj, 'bar'), true, 'lazily watching dependent key');

      defineProperty(
        obj,
        'foo',
        computed(function() {
          count++;
          return 'baz ' + count;
        }).property('baz')
      );

      assert.equal(
        isWatching(obj, 'bar'),
        false,
        'after redefining should not be watching dependent key'
      );

      assert.equal(get(obj, 'foo'), 'baz 2');

      set(obj, 'bar', 'BIFF'); // should not kill cache
      assert.equal(get(obj, 'foo'), 'baz 2');

      set(obj, 'baz', 'BOP');
      assert.equal(get(obj, 'foo'), 'baz 3');
    }

    ['@test can watch multiple dependent keys specified declaratively via brace expansion'](
      assert
    ) {
      defineProperty(
        obj,
        'foo',
        computed(function() {
          count++;
          return 'foo ' + count;
        }).property('qux.{bar,baz}')
      );

      assert.equal(get(obj, 'foo'), 'foo 1', 'get once');
      assert.equal(get(obj, 'foo'), 'foo 1', 'cached retrieve');

      set(obj, 'qux', {});
      set(obj, 'qux.bar', 'bar'); // invalidate foo

      assert.equal(get(obj, 'foo'), 'foo 2', 'foo invalidated from bar');

      set(obj, 'qux.baz', 'baz'); // invalidate foo

      assert.equal(get(obj, 'foo'), 'foo 3', 'foo invalidated from baz');

      set(obj, 'qux.quux', 'quux'); // do not invalidate foo

      assert.equal(get(obj, 'foo'), 'foo 3', 'foo not invalidated by quux');
    }

    ['@test throws assertion if brace expansion notation has spaces']() {
      expectAssertion(function() {
        defineProperty(
          obj,
          'roo',
          computed(function() {
            count++;
            return 'roo ' + count;
          }).property('fee.{bar, baz,bop , }')
        );
      }, /cannot contain spaces/);
    }

    ['@test throws an assertion if an uncached `get` is called after object is destroyed'](assert) {
      assert.equal(isWatching(obj, 'bar'), false, 'precond not watching dependent key');

      let meta = metaFor(obj);
      meta.destroy();

      obj.toString = () => '<custom-obj:here>';

      expectAssertion(() => {
        get(obj, 'foo');
      }, 'Cannot modify dependent keys for `foo` on `<custom-obj:here>` after it has been destroyed.');

      assert.equal(isWatching(obj, 'bar'), false, 'deps were not updated');
    }
  }
);

// ..........................................................
// CHAINED DEPENDENT KEYS
//

let func;

moduleFor(
  'computed - dependentkey with chained properties',
  class extends AbstractTestCase {
    beforeEach() {
      obj = {
        foo: {
          bar: {
            baz: {
              biff: 'BIFF',
            },
          },
        },
      };

      count = 0;
      func = function() {
        count++;
        return get(obj, 'foo.bar.baz.biff') + ' ' + count;
      };
    }

    afterEach() {
      obj = count = func = null;
    }

    ['@test depending on simple chain'](assert) {
      // assign computed property
      defineProperty(obj, 'prop', computed(func).property('foo.bar.baz.biff'));

      assert.equal(get(obj, 'prop'), 'BIFF 1');

      set(get(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
      assert.equal(get(obj, 'prop'), 'BUZZ 2');
      assert.equal(get(obj, 'prop'), 'BUZZ 2');

      set(get(obj, 'foo.bar'), 'baz', { biff: 'BLOB' });
      assert.equal(get(obj, 'prop'), 'BLOB 3');
      assert.equal(get(obj, 'prop'), 'BLOB 3');

      set(get(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
      assert.equal(get(obj, 'prop'), 'BUZZ 4');
      assert.equal(get(obj, 'prop'), 'BUZZ 4');

      set(get(obj, 'foo'), 'bar', { baz: { biff: 'BOOM' } });
      assert.equal(get(obj, 'prop'), 'BOOM 5');
      assert.equal(get(obj, 'prop'), 'BOOM 5');

      set(get(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
      assert.equal(get(obj, 'prop'), 'BUZZ 6');
      assert.equal(get(obj, 'prop'), 'BUZZ 6');

      set(obj, 'foo', { bar: { baz: { biff: 'BLARG' } } });
      assert.equal(get(obj, 'prop'), 'BLARG 7');
      assert.equal(get(obj, 'prop'), 'BLARG 7');

      set(get(obj, 'foo.bar.baz'), 'biff', 'BUZZ');
      assert.equal(get(obj, 'prop'), 'BUZZ 8');
      assert.equal(get(obj, 'prop'), 'BUZZ 8');

      defineProperty(obj, 'prop');
      set(obj, 'prop', 'NONE');
      assert.equal(get(obj, 'prop'), 'NONE');

      set(obj, 'foo', { bar: { baz: { biff: 'BLARG' } } });
      assert.equal(get(obj, 'prop'), 'NONE'); // should do nothing
      assert.equal(count, 8, 'should be not have invoked computed again');
    }

    ['@test chained dependent keys should evaluate computed properties lazily'](assert) {
      defineProperty(obj.foo.bar, 'b', computed(func));
      defineProperty(obj.foo, 'c', computed(function() {}).property('bar.b'));
      assert.equal(count, 0, 'b should not run');
    }
  }
);

// ..........................................................
// improved-cp-syntax
//

moduleFor(
  'computed - improved cp syntax',
  class extends AbstractTestCase {
    ['@test setter and getters are passed using an object'](assert) {
      let testObj = EmberObject.extend({
        a: '1',
        b: '2',
        aInt: computed('a', {
          get(keyName) {
            assert.equal(keyName, 'aInt', 'getter receives the keyName');
            return parseInt(this.get('a'));
          },
          set(keyName, value, oldValue) {
            assert.equal(keyName, 'aInt', 'setter receives the keyName');
            assert.equal(value, 123, 'setter receives the new value');
            assert.equal(oldValue, 1, 'setter receives the old value');
            this.set('a', '' + value); // side effect
            return parseInt(this.get('a'));
          },
        }),
      }).create();

      assert.ok(testObj.get('aInt') === 1, 'getter works');
      testObj.set('aInt', 123);
      assert.ok(testObj.get('a') === '123', 'setter works');
      assert.ok(testObj.get('aInt') === 123, 'cp has been updated too');
    }

    ['@test setter can be omited'](assert) {
      let testObj = EmberObject.extend({
        a: '1',
        b: '2',
        aInt: computed('a', {
          get(keyName) {
            assert.equal(keyName, 'aInt', 'getter receives the keyName');
            return parseInt(this.get('a'));
          },
        }),
      }).create();

      assert.ok(testObj.get('aInt') === 1, 'getter works');
      assert.ok(testObj.get('a') === '1');
      testObj.set('aInt', '123');
      assert.ok(testObj.get('aInt') === '123', 'cp has been updated too');
    }

    ['@test getter can be omited'](assert) {
      let testObj = EmberObject.extend({
        com: computed({
          set(key, value) {
            return value;
          },
        }),
      }).create();

      assert.ok(testObj.get('com') === undefined);
      testObj.set('com', '123');
      assert.ok(testObj.get('com') === '123', 'cp has been updated');
    }

    ['@test the return value of the setter gets cached'](assert) {
      let testObj = EmberObject.extend({
        a: '1',
        sampleCP: computed('a', {
          get() {
            assert.ok(false, 'The getter should not be invoked');
            return 'get-value';
          },
          set() {
            return 'set-value';
          },
        }),
      }).create();

      testObj.set('sampleCP', 'abcd');
      assert.ok(testObj.get('sampleCP') === 'set-value', 'The return value of the CP was cached');
    }
  }
);

// ..........................................................
// BUGS
//

moduleFor(
  'computed edge cases',
  class extends AbstractTestCase {
    ['@test adding a computed property should show up in key iteration'](assert) {
      let obj = {};
      defineProperty(obj, 'foo', computed(function() {}));

      let found = [];
      for (let key in obj) {
        found.push(key);
      }
      assert.ok(
        found.indexOf('foo') >= 0,
        'should find computed property in iteration found=' + found
      );
      assert.ok('foo' in obj, 'foo in obj should pass');
    }

    ["@test when setting a value after it had been retrieved empty don't pass function UNDEFINED as oldValue"](
      assert
    ) {
      let obj = {};
      let oldValueIsNoFunction = true;

      defineProperty(
        obj,
        'foo',
        computed({
          get() {},
          set(key, value, oldValue) {
            if (typeof oldValue === 'function') {
              oldValueIsNoFunction = false;
            }
            return undefined;
          },
        })
      );

      get(obj, 'foo');
      set(obj, 'foo', undefined);

      assert.ok(oldValueIsNoFunction);
    }
  }
);

moduleFor(
  'computed - setter',
  class extends AbstractTestCase {
    ['@test setting a watched computed property'](assert) {
      let obj = {
        firstName: 'Yehuda',
        lastName: 'Katz',
      };

      defineProperty(
        obj,
        'fullName',
        computed({
          get() {
            return get(this, 'firstName') + ' ' + get(this, 'lastName');
          },
          set(key, value) {
            let values = value.split(' ');
            set(this, 'firstName', values[0]);
            set(this, 'lastName', values[1]);
            return value;
          },
        }).property('firstName', 'lastName')
      );

      let fullNameDidChange = 0;
      let firstNameDidChange = 0;
      let lastNameDidChange = 0;
      addObserver(obj, 'fullName', function() {
        fullNameDidChange++;
      });
      addObserver(obj, 'firstName', function() {
        firstNameDidChange++;
      });
      addObserver(obj, 'lastName', function() {
        lastNameDidChange++;
      });

      assert.equal(get(obj, 'fullName'), 'Yehuda Katz');

      set(obj, 'fullName', 'Yehuda Katz');

      set(obj, 'fullName', 'Kris Selden');

      assert.equal(get(obj, 'fullName'), 'Kris Selden');
      assert.equal(get(obj, 'firstName'), 'Kris');
      assert.equal(get(obj, 'lastName'), 'Selden');

      assert.equal(fullNameDidChange, 1);
      assert.equal(firstNameDidChange, 1);
      assert.equal(lastNameDidChange, 1);
    }

    ['@test setting a cached computed property that modifies the value you give it'](assert) {
      let obj = {
        foo: 0,
      };

      defineProperty(
        obj,
        'plusOne',
        computed({
          get() {
            return get(this, 'foo') + 1;
          },
          set(key, value) {
            set(this, 'foo', value);
            return value + 1;
          },
        }).property('foo')
      );

      let plusOneDidChange = 0;
      addObserver(obj, 'plusOne', function() {
        plusOneDidChange++;
      });

      assert.equal(get(obj, 'plusOne'), 1);
      set(obj, 'plusOne', 1);
      assert.equal(get(obj, 'plusOne'), 2);
      set(obj, 'plusOne', 1);
      assert.equal(get(obj, 'plusOne'), 2);

      assert.equal(plusOneDidChange, 1);

      set(obj, 'foo', 5);
      assert.equal(get(obj, 'plusOne'), 6);

      assert.equal(plusOneDidChange, 2);
    }
  }
);

moduleFor(
  'computed - default setter',
  class extends AbstractTestCase {
    ["@test when setting a value on a computed property that doesn't handle sets"](assert) {
      let obj = {};
      let observerFired = false;

      defineProperty(
        obj,
        'foo',
        computed(function() {
          return 'foo';
        })
      );

      addObserver(obj, 'foo', null, () => (observerFired = true));

      set(obj, 'foo', 'bar');

      assert.equal(get(obj, 'foo'), 'bar', 'The set value is properly returned');
      assert.ok(typeof obj.foo === 'string', 'The computed property was removed');
      assert.ok(observerFired, 'The observer was still notified');
    }
  }
);

moduleFor(
  'computed - readOnly',
  class extends AbstractTestCase {
    ['@test is chainable'](assert) {
      let cp = computed(function() {}).readOnly();

      assert.ok(cp instanceof Descriptor);
      assert.ok(cp instanceof ComputedProperty);
    }

    ['@test throws assertion if called over a CP with a setter defined with the new syntax']() {
      expectAssertion(() => {
        computed({
          get() {},
          set() {},
        }).readOnly();
      }, /Computed properties that define a setter using the new syntax cannot be read-only/);
    }

    ['@test protects against setting'](assert) {
      let obj = {};

      defineProperty(
        obj,
        'bar',
        computed(function() {
          return 'barValue';
        }).readOnly()
      );

      assert.equal(get(obj, 'bar'), 'barValue');

      assert.throws(() => {
        set(obj, 'bar', 'newBar');
      }, /Cannot set read\-only property "bar" on object:/);

      assert.equal(get(obj, 'bar'), 'barValue');
    }
  }
);
