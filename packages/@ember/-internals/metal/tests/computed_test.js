import { Object as EmberObject } from '@ember/-internals/runtime';
import {
  computed,
  defineProperty,
  destroy,
  getCachedValueFor,
  isClassicDecorator,
  isComputed,
  get,
  set,
  addObserver,
} from '..';
import { meta as metaFor } from '@ember/-internals/meta';
import { moduleFor, AbstractTestCase, runLoopSettled } from 'internal-test-helpers';

let obj, objA, objB, count, func;

class ComputedTestCase extends AbstractTestCase {
  afterEach() {
    let destroyables = [obj, objA, objB].filter(Boolean);
    obj = objA = objB = count = func = undefined;
    destroyables.forEach(destroy);
    return runLoopSettled();
  }
}

moduleFor(
  'computed',
  class extends ComputedTestCase {
    ['@test isComputed is true for computed property on a factory'](assert) {
      let Obj = EmberObject.extend({
        foo: computed(function() {}),
      });

      Obj.proto(); // ensure the prototype is "collapsed" / merged

      assert.ok(isComputed(Obj.prototype, 'foo'));
    }

    ['@test isComputed is true for computed property on an instance'](assert) {
      obj = EmberObject.extend({
        foo: computed(function() {}),
      }).create();

      assert.ok(isComputed(obj, 'foo'));
    }

    ['@test computed property should be an instance of descriptor'](assert) {
      assert.ok(isClassicDecorator(computed(function() {})));
    }

    ['@test computed properties assert the presence of a getter or setter function']() {
      expectAssertion(function() {
        obj = {};
        defineProperty(obj, 'someProp', computed('nogetternorsetter', {}));
      }, 'Computed properties must receive a getter or a setter, you passed none.');
    }

    ['@test computed properties check for the presence of a function or configuration object']() {
      expectAssertion(function() {
        obj = {};
        defineProperty(obj, 'someProp', computed('nolastargument'));
      }, 'Attempted to use @computed on someProp, but it did not have a getter or a setter. You must either pass a get a function or getter/setter to @computed directly (e.g. `@computed({ get() { ... } })`) or apply @computed directly to a getter/setter');
    }

    // non valid properties are stripped away in the process of creating a computed property descriptor
    ['@test computed properties defined with an object only allow `get` and `set` keys']() {
      expectAssertion(function() {
        obj = EmberObject.extend({
          someProp: computed({
            get() {},
            set() {},
            other() {},
          }),
        });

        obj.create().someProp;
      }, 'Config object passed to computed can only contain `get` and `set` keys.');
    }

    ['@test computed property can be accessed without `get`'](assert) {
      obj = {};
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
      obj = {};
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

    ['@test computed property can be defined and accessed on a class constructor'](assert) {
      let count = 0;

      let Obj = EmberObject.extend();
      Obj.reopenClass({
        bar: 123,

        foo: computed(function() {
          count++;
          return this.bar;
        }),
      });

      assert.equal(Obj.foo, 123, 'should return value');
      Obj.foo;

      assert.equal(count, 1, 'should only call getter once');
    }

    ['@test can override volatile computed property'](assert) {
      obj = {};

      expectDeprecation(() => {
        defineProperty(obj, 'foo', computed(function() {}).volatile());
      }, 'Setting a computed property as volatile has been deprecated. Instead, consider using a native getter with native class syntax.');

      expectDeprecation(() => {
        set(obj, 'foo', 'boom');
      }, /The \[object Object\]#foo computed property was just overridden./);

      assert.equal(obj.foo, 'boom');
    }

    ['@test defining computed property should invoke property on set'](assert) {
      obj = {};
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

    // this should be a unit test elsewhere
    // computed is more integration-like, and this test asserts on implementation details.
    // ['@test defining a computed property with a dependent key ending with @each is expanded to []'](
    //   assert
    // ) {
    //   let cp = computed('blazo.@each', function() {});

    //   assert.deepEqual(cp._dependentKeys, ['blazo.[]']);

    //   cp = computed('qux', 'zoopa.@each', function() {});

    //   assert.deepEqual(cp._dependentKeys, ['qux', 'zoopa.[]']);
    // }

    ['@test defining a computed property with a dependent key more than one level deep beyond @each is not supported']() {
      expectNoWarning(() => {
        obj = {};
        defineProperty(obj, 'someProp', computed('todos', () => {}));
      });

      expectNoWarning(() => {
        obj = {};
        defineProperty(obj, 'someProp', computed('todos.@each.owner', () => {}));
      });

      expectWarning(() => {
        obj = {};
        defineProperty(obj, 'someProp', computed('todos.@each.owner.name', () => {}));
      }, /You used the key "todos\.@each\.owner\.name" which is invalid\. /);

      expectWarning(() => {
        obj = {};
        defineProperty(obj, 'someProp', computed('todos.@each.owner.@each.name', () => {}));
      }, /You used the key "todos\.@each\.owner\.@each\.name" which is invalid\. /);

      let expected = new RegExp(
        'When using @each in a dependent-key or an observer, ' +
          'you can only chain one property level deep after the @each\\. ' +
          'That is, `todos\\.@each\\.owner` is allowed but ' +
          '`todos\\.@each\\.owner\\.name` \\(which is what you passed\\) is not\\.\n\n' +
          'This was never supported\\. Currently, the extra segments ' +
          'are silently ignored, i\\.e\\. `todos\\.@each\\.owner\\.name` ' +
          'behaves exactly the same as `todos\\.@each\\.owner`\\. ' +
          'In the future, this will throw an error\\.\n\n' +
          'If the current behavior is acceptable for your use case, ' +
          'please remove the extraneous segments by changing your key to ' +
          '`todos\\.@each\\.owner`\\. Otherwise, please create an ' +
          'intermediary computed property or switch to using tracked properties\\.'
      );

      expectDeprecation(() => {
        obj = {
          todos: [],
        };
        defineProperty(obj, 'someProp', computed('todos.@each.owner.name', () => {}));

        get(obj, 'someProp');
      }, expected);
    }
  }
);

moduleFor(
  'computed should inherit through prototype',
  class extends ComputedTestCase {
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
  class extends ComputedTestCase {
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
  class extends ComputedTestCase {
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
  class extends ComputedTestCase {
    beforeEach() {
      obj = {};
      count = 0;
      let func = function() {
        count++;
        return 'bar ' + count;
      };
      defineProperty(obj, 'foo', computed({ get: func, set: func }));
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
      obj = {
        foo: 0,
      };

      let receivedOldValue;

      defineProperty(
        obj,
        'plusOne',
        computed('foo', {
          get() {},
          set(key, value, oldValue) {
            receivedOldValue = oldValue;
            return value;
          },
        })
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
  class extends ComputedTestCase {
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
        computed('bar', {
          get: getterAndSetter,
          set: getterAndSetter,
        })
      );
    }

    ['@test circular keys should not blow up'](assert) {
      let func = function() {
        count++;
        return 'bar ' + count;
      };
      defineProperty(obj, 'bar', computed('foo', { get: func, set: func }));

      defineProperty(
        obj,
        'foo',
        computed('bar', function() {
          count++;
          return 'foo ' + count;
        })
      );

      assert.equal(get(obj, 'foo'), 'foo 1', 'get once');
      assert.equal(get(obj, 'foo'), 'foo 1', 'cached retrieve');

      set(obj, 'bar', 'BIFF'); // should invalidate bar -> foo -> bar

      assert.equal(get(obj, 'foo'), 'foo 3', 'should recache');
      assert.equal(get(obj, 'foo'), 'foo 3', 'cached retrieve');
    }

    ['@test redefining a property should undo old dependent keys'](assert) {
      assert.equal(get(obj, 'foo'), 'bar 1');

      defineProperty(
        obj,
        'foo',
        computed('baz', function() {
          count++;
          return 'baz ' + count;
        })
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
        computed('qux.{bar,baz}', function() {
          count++;
          return 'foo ' + count;
        })
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
          computed('fee.{bar, baz,bop , }', function() {
            count++;
            return 'roo ' + count;
          })
        );
      }, /cannot contain spaces/);
    }

    ['@test throws an assertion if an uncached `get` is called after object is destroyed']() {
      let meta = metaFor(obj);
      meta.destroy();

      obj.toString = () => '<custom-obj:here>';

      let message =
        'Attempted to access the computed <custom-obj:here>.foo on a destroyed object, which is not allowed';

      expectAssertion(() => get(obj, 'foo'), message);
    }

    ['@test does not throw an assertion if an uncached `get` is called on computed without dependencies after object is destroyed'](
      assert
    ) {
      let meta = metaFor(obj);
      defineProperty(
        obj,
        'foo',
        computed(function() {
          return 'baz';
        })
      );

      meta.destroy();

      assert.equal(get(obj, 'foo'), 'baz', 'CP calculated successfully');
    }
  }
);

// ..........................................................
// CHAINED DEPENDENT KEYS
//

moduleFor(
  'computed - dependentkey with chained properties',
  class extends ComputedTestCase {
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

    ['@test depending on simple chain'](assert) {
      // assign computed property
      defineProperty(obj, 'prop', computed('foo.bar.baz.biff', func));

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
      defineProperty(obj.foo, 'c', computed('bar.b', function() {}));
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
            this.set('a', String(value)); // side effect
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

      expectDeprecation(() => {
        testObj.set('aInt', '123');
      }, /The <\(unknown\):ember\d*>#aInt computed property was just overridden/);

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
  class extends ComputedTestCase {
    ['@test adding a computed property should show up in key iteration'](assert) {
      obj = {};
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
      obj = {};
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
  class extends ComputedTestCase {
    async ['@test setting a watched computed property'](assert) {
      obj = {
        firstName: 'Yehuda',
        lastName: 'Katz',
      };

      defineProperty(
        obj,
        'fullName',
        computed('firstName', 'lastName', {
          get() {
            return get(this, 'firstName') + ' ' + get(this, 'lastName');
          },
          set(key, value) {
            let values = value.split(' ');
            set(this, 'firstName', values[0]);
            set(this, 'lastName', values[1]);
            return value;
          },
        })
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

      await runLoopSettled();

      assert.equal(fullNameDidChange, 1);
      assert.equal(firstNameDidChange, 1);
      assert.equal(lastNameDidChange, 1);
    }

    async ['@test setting a cached computed property that modifies the value you give it'](assert) {
      obj = {
        foo: 0,
      };

      defineProperty(
        obj,
        'plusOne',
        computed('foo', {
          get() {
            return get(this, 'foo') + 1;
          },
          set(key, value) {
            set(this, 'foo', value);
            return value + 1;
          },
        })
      );

      let plusOneDidChange = 0;
      addObserver(obj, 'plusOne', function() {
        plusOneDidChange++;
      });

      assert.equal(get(obj, 'plusOne'), 1);

      set(obj, 'plusOne', 1);
      await runLoopSettled();

      assert.equal(get(obj, 'plusOne'), 2);

      set(obj, 'plusOne', 1);
      await runLoopSettled();

      assert.equal(get(obj, 'plusOne'), 2);
      assert.equal(plusOneDidChange, 1);

      set(obj, 'foo', 5);
      await runLoopSettled();

      assert.equal(get(obj, 'plusOne'), 6);
      assert.equal(plusOneDidChange, 2);
    }
  }
);

moduleFor(
  'computed - default setter',
  class extends ComputedTestCase {
    async ["@test when setting a value on a computed property that doesn't handle sets"](assert) {
      obj = {};
      let observerFired = false;

      defineProperty(
        obj,
        'foo',
        computed(function() {
          return 'foo';
        })
      );

      addObserver(obj, 'foo', null, () => (observerFired = true));

      expectDeprecation(() => {
        set(obj, 'foo', 'bar');
      }, /The \[object Object\]#foo computed property was just overridden./);

      assert.equal(get(obj, 'foo'), 'bar', 'The set value is properly returned');
      assert.ok(typeof obj.foo === 'string', 'The computed property was removed');

      await runLoopSettled();

      assert.ok(observerFired, 'The observer was still notified');
    }
  }
);

moduleFor(
  'computed - readOnly',
  class extends ComputedTestCase {
    ['@test is chainable'](assert) {
      let cp = computed(function() {});
      let readOnlyCp = cp.readOnly();

      assert.equal(cp, readOnlyCp);
    }

    ['@test throws assertion if called over a CP with a setter defined with the new syntax']() {
      expectAssertion(() => {
        obj = {};
        defineProperty(
          obj,
          'someProp',
          computed({
            get() {},
            set() {},
          }).readOnly()
        );
      }, /Computed properties that define a setter using the new syntax cannot be read-only/);
    }

    ['@test protects against setting'](assert) {
      obj = {};

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
      }, /Cannot set read-only property "bar" on object:/);

      assert.equal(get(obj, 'bar'), 'barValue');
    }
  }
);

class LazyObject {
  value = 123;

  @computed('_value')
  get value() {
    return get(this, '_value');
  }

  set value(value) {
    set(this, '_value', value);
  }

  static create() {
    obj = new LazyObject();

    // ensure a tag exists for the value computed
    get(obj, 'value');

    return obj;
  }
}

moduleFor(
  'computed - lazy dependencies',
  class extends ComputedTestCase {
    '@test computed properties with lazy dependencies work as expected'(assert) {
      let calledCount = 0;
      let lazyObject = LazyObject.create();

      class ObjectWithLazyDep {
        @computed('lazyObject.value')
        get someProp() {
          return ++calledCount;
        }

        @computed('otherProp')
        get lazyObject() {
          return lazyObject;
        }
      }

      obj = new ObjectWithLazyDep();

      // Get someProp and setup the lazy dependency
      assert.equal(obj.someProp, 1, 'called the first time');
      assert.equal(obj.someProp, 1, 'returned cached value the second time');

      // Finish the lazy dependency
      assert.equal(obj.lazyObject.value, 123, 'lazyObject returns expected value');
      assert.equal(
        obj.someProp,
        1,
        'someProp was not dirtied by propB being calculated for the first time'
      );

      set(lazyObject, 'value', 456);
      assert.equal(obj.someProp, 2, 'someProp dirtied by lazyObject.value changing');

      set(lazyObject, 'value', 789);
      assert.equal(
        obj.someProp,
        3,
        'someProp still dirtied by otherProp when lazyObject.value is dirty'
      );
    }

    '@test computed properties with lazy dependencies do not dirty until dependencies have been read at least once'(
      assert
    ) {
      let calledCount = 0;
      let lazyObject = LazyObject.create();

      class ObjectWithLazyDep {
        @computed('lazyObject.value')
        get someProp() {
          return ++calledCount;
        }

        @computed('otherProp')
        get lazyObject() {
          return lazyObject;
        }
      }

      obj = new ObjectWithLazyDep();

      assert.equal(obj.someProp, 1, 'called the first time');
      assert.equal(obj.someProp, 1, 'returned cached value the second time');

      // dirty the object value before the dependency has been finished
      set(lazyObject, 'value', 456);

      assert.equal(obj.lazyObject.value, 456, 'propB returns expected value');
      assert.equal(
        obj.someProp,
        1,
        'someProp was not dirtied by propB being dirtied before it has been calculated'
      );
    }

    '@test computed properties with lazy dependencies work correctly if lazy dependency is more recent'(
      assert
    ) {
      let calledCount = 0;
      let lazyObject = LazyObject.create();

      class ObjectWithLazyDep {
        @computed('lazyObject.value')
        get someProp() {
          return ++calledCount;
        }

        @computed('otherProp')
        get lazyObject() {
          return lazyObject;
        }
      }

      obj = new ObjectWithLazyDep();

      set(lazyObject, 'value', 456);

      assert.equal(obj.someProp, 1, 'called the first time');
      assert.equal(obj.someProp, 1, 'returned cached value the second time');

      assert.equal(obj.lazyObject.value, 456, 'lazyObject returns expected value');

      assert.equal(
        obj.someProp,
        1,
        'someProp was not dirtied by lazyObject being dirtied before it has been calculated'
      );
    }
  }
);

moduleFor(
  'computed - observer interop',
  class extends ComputedTestCase {
    async '@test observers that do not consume computed properties still work'(assert) {
      assert.expect(2);

      class Foo {
        otherProp = 123;

        @computed('otherProp')
        get someProp() {
          return this.otherProp;
        }
      }

      obj = new Foo();

      addObserver(
        obj,
        'otherProp',
        obj,
        () => assert.ok(true, 'otherProp observer called when it was changed'),
        false
      );

      addObserver(
        obj,
        'someProp',
        obj,
        () => assert.ok(false, 'someProp observer called when it was not changed'),
        false
      );

      set(obj, 'otherProp', 456);

      await runLoopSettled();

      assert.equal(get(obj, 'someProp'), 456, '');

      addObserver(obj, 'anotherProp', obj, () => {}, false);
      set(obj, 'anotherProp', 123);

      await runLoopSettled();
    }
  }
);
