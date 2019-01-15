import { Object as EmberObject } from '@ember/-internals/runtime';
import {
  ComputedProperty,
  computed,
  getCachedValueFor,
  Descriptor,
  defineProperty,
  get,
  set,
  setProperties,
  isWatching,
  addObserver,
} from '..';
import { meta as metaFor } from '@ember/-internals/meta';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

let obj, count;

moduleFor(
  'computed - decorator - compatibility',
  class extends AbstractTestCase {
    ['@test computed can be used to compose new decorators'](assert) {
      let firstName = 'Diana';

      let firstNameAlias = computed('firstName', function() {
        return this.firstName;
      });

      let Class1 = EmberObject.extend({
        firstName,
        otherFirstName: firstNameAlias
      });

      // debugger;

      class Class2 {
        firstName = firstName;

        @firstNameAlias otherFirstName;
      }

      let obj1 = new Class1();
      let obj2 = new Class2();

      assert.equal(firstName, obj1.otherFirstName);
      assert.equal(firstName, obj2.otherFirstName);
    }

    ['@test decorator can still have a configuration object'](assert) {
      class Foo {
        bar = 'something';
        foo = 'else';

        @(computed('foo', {
          get() {
            return this.bar;
          }
        }))
        baz;
      }

      let obj1 = new Foo();

      assert.equal('something', obj1.baz);
    }

    ['@test it works with functions'](assert) {
      assert.expect(2);

      class Foo {
        first = 'rob';
        last = 'jackson';

        @computed('first', 'last', function() {
          assert.equal(this.first, 'rob');
          assert.equal(this.last, 'jackson');
        }) fullName;
      }

      let obj = new Foo();
      get(obj, 'fullName');
    }

    ['@test it works with computed desc'](assert) {
      assert.expect(4);

      let expectedName = 'rob jackson';
      let expectedFirst = 'rob';
      let expectedLast = 'jackson';

      class Foo {
        first = 'rob';
        last = 'jackson';

        @computed('first', 'last', {
          get() {
            assert.equal(this.first, expectedFirst, 'getter: first name matches');
            assert.equal(this.last, expectedLast, 'getter: last name matches');
            return `${this.first} ${this.last}`;
          },

          set(key, name) {
            assert.equal(name, expectedName, 'setter: name matches');

            const [first, last] = name.split(' ');
            setProperties(this, { first, last });

            return name;
          }
        }) fullName;
      }

      let obj = new Foo();
      get(obj, 'fullName');

      expectedName = 'yehuda katz';
      expectedFirst = 'yehuda';
      expectedLast = 'katz';
      set(obj, 'fullName', 'yehuda katz');

      assert.strictEqual(get(obj, 'fullName'), expectedName, 'return value of getter is new value of property');
    }


    ['@test it works with classic classes with full desc'](assert) {
      assert.expect(4);

      let expectedName = 'rob jackson';
      let expectedFirst = 'rob';
      let expectedLast = 'jackson';

      const Foo = EmberObject.extend({
        first: 'rob',
        last: 'jackson',

        fullName: computed('first', 'last', {
          get() {
            assert.equal(this.first, expectedFirst, 'getter: first name matches');
            assert.equal(this.last, expectedLast, 'getter: last name matches');
            return `${this.first} ${this.last}`;
          },

          set(key, name) {
            assert.equal(name, expectedName, 'setter: name matches');

            const [first, last] = name.split(' ');
            setProperties(this, { first, last });

            return name;
          }
        })
      });

      let obj = Foo.create();
      get(obj, 'fullName');

      expectedName = 'yehuda katz';
      expectedFirst = 'yehuda';
      expectedLast = 'katz';
      set(obj, 'fullName', 'yehuda katz');

      assert.strictEqual(get(obj, 'fullName'), expectedName, 'return value of getter is new value of property');
    }
  }
);

moduleFor(
  'computed - decorator - usage tests',
  class extends AbstractTestCase {
    ['@test computed property asserts the presence of a getter'](assert) {
      assert.throws(() => {
        class TestObj {
          @computed()
          nonGetter() {
            return  true;
          }
        }

        new TestObj();
      }, /Try converting it to a getter/);
    }

    ['@test computed property works with a getter'](assert) {
      class TestObj {
        @computed()
        get someGetter() {
          return true;
        }
      }

      let instance = new TestObj();
      assert.ok(instance.someGetter);
    }

    ['@test computed property with dependent key and getter'](assert) {
      class TestObj {
        other = true;

        @computed('other')
        get someGetter() {
          return `${this.other}`;
        }
      }

      let instance = new TestObj();
      assert.equal(instance.someGetter, 'true');

      set(instance, 'other', false);
      assert.equal(instance.someGetter, 'false');
    }
  }
);


moduleFor(
  'computed - decorators',
  class extends AbstractTestCase {
    ['@test computed property can be accessed without `get`'](assert) {
      let count = 0;
      class Obj {
        @computed()
        get foo() {
          count++;
          return `computed foo`;
        }
      }
      let obj = new Obj();

      assert.equal(obj.foo, 'computed foo', 'should return value');
      assert.equal(count, 1, 'should have invoked computed property');
    }

    ['@test defining computed property should invoke property on get'](assert) {
      let count = 0;
      class Obj {
        @computed()
        get foo() {
          count++;
          return `computed foo`;
        }
      }
      let obj = new Obj();

      assert.equal(obj.foo, 'computed foo', 'should return value');
      assert.equal(count, 1, 'should have invoked computed property');
    }

    ['@test defining computed property should invoke property on set with native'](assert) {
      let count = 0;
      class Obj {
        __foo = 'not set';

        @computed()
        get foo() {
          return this.__foo;
        }
        set foo(value) {
          count++;
          this.__foo = `computed ${value}`;
          return this.__foo;
        }
      }
      let obj = new Obj();

      assert.equal(obj.foo = 'bar', 'bar', 'should return set value');
      assert.equal(count, 1, 'should have invoked computed property');
      assert.equal(obj.foo, 'computed bar', 'should return new value');
    }

    ['@test defining computed property should invoke property on set'](assert) {
      let count = 0;
      class Obj {
        __foo = 'not set';

        @computed()
        get foo() {
          return this.__foo;
        }
        set foo(value) {
          count++;
          this.__foo = `computed ${value}`;
          return this.__foo;
        }
      }
      let obj = new Obj();

      assert.equal(set(obj, 'foo', 'bar'), 'bar', 'should return set value with set()');
      assert.equal(count, 1, 'should have invoked computed property');
      assert.equal(get(obj, 'foo'), 'computed bar', 'should return new value with get()');
    }
  }
);

moduleFor(
  'computed - decorators - cacheable',
  class extends AbstractTestCase {
    beforeEach() {
      count = 0;
      let func = function() {
        count++;
        return 'bar ' + count;
      };

      class Obj {
        @computed()
        get foo() {
          return func();
        }
        set foo(value) {
          return func(value);
        }
      }

      obj = new Obj();
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
      let obj = new class {
        @computed()
        get falsy() { return false; }
      }

      assert.equal(getCachedValueFor(obj, 'falsy'), undefined, 'should not yet be a cached value');

      get(obj, 'falsy');

      assert.equal(getCachedValueFor(obj, 'falsy'), false, 'should retrieve cached value');
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
      count = 0;
      let getterAndSetter = function() {
        count++;
        get(this, 'bar');
        return 'bar ' + count;
      };

      obj = new class {
        bar = 'baz';

        @computed('bar')
        get foo() {
          return getterAndSetter()
        }
        set foo(_value) {
          return getterAndSetter()
        }
      };
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
