import { Object as EmberObject } from '@ember/-internals/runtime';
import { computed, get, set, setProperties } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'computed - decorator - compatibility',
  class extends AbstractTestCase {
    ['@test computed can be used to compose new decorators'](assert) {
      let firstName = 'Diana';

      let firstNameAlias = computed('firstName', {
        get() {
          return this.firstName;
        },
      });

      class Class1 {
        firstName = firstName;

        @firstNameAlias otherFirstName;
      }

      let Class2 = EmberObject.extend({
        firstName,
        otherFirstName: firstNameAlias,
      });

      let obj1 = new Class1();
      let obj2 = Class2.create();

      assert.equal(firstName, obj1.otherFirstName);
      assert.equal(firstName, obj2.otherFirstName);
    }

    ['@test decorator can still have a configuration object'](assert) {
      class Foo {
        bar = 'something';
        foo = 'else';

        @computed('foo', {
          get() {
            return this.bar;
          },
        })
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
        })
        fullName;
      }

      let obj = new Foo();
      get(obj, 'fullName');
    }

    ['@test computed property can be defined and accessed on a class constructor'](assert) {
      let count = 0;

      class Obj {
        static bar = 123;

        @computed
        static get foo() {
          count++;
          return this.bar;
        }
      }

      assert.equal(Obj.foo, 123, 'should return value');
      Obj.foo;

      assert.equal(count, 1, 'should only call getter once');
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

            let [first, last] = name.split(' ');
            setProperties(this, { first, last });

            return name;
          },
        })
        fullName;
      }

      let obj = new Foo();
      get(obj, 'fullName');

      expectedName = 'yehuda katz';
      expectedFirst = 'yehuda';
      expectedLast = 'katz';
      set(obj, 'fullName', 'yehuda katz');

      assert.strictEqual(
        get(obj, 'fullName'),
        expectedName,
        'return value of getter is new value of property'
      );
    }

    ['@test it throws if it receives a desc and decorates a getter/setter']() {
      expectAssertion(() => {
        class Foo {
          bar;

          @computed('bar', {
            get() {
              return this.bar;
            },
          })
          set foo(value) {
            set(this, 'bar', value);
          }
        }

        new Foo();
      }, /Attempted to apply a computed property that already has a getter\/setter to a foo, but it is a method or an accessor./);
    }

    ['@test it throws if a CP is passed to it']() {
      expectAssertion(() => {
        class Foo {
          bar;

          @computed(
            'bar',
            computed({
              get() {
                return this._foo;
              },
            })
          )
          foo;
        }

        new Foo();
      }, 'You attempted to pass a computed property instance to computed(). Computed property instances are decorator functions, and cannot be passed to computed() because they cannot be turned into decorators twice');
    }
  }
);

moduleFor(
  'computed - decorator - usage tests',
  class extends AbstractTestCase {
    ['@test computed property asserts the presence of a getter']() {
      expectAssertion(() => {
        class TestObj {
          @computed()
          nonGetter() {
            return true;
          }
        }

        new TestObj();
      }, /Try converting it to a getter/);
    }

    ['@test computed property works with a getter'](assert) {
      class TestObj {
        @computed
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

    ['@test setter is invoked with correct parameters'](assert) {
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
        }
      }
      let obj = new Obj();

      assert.equal(set(obj, 'foo', 'bar'), 'bar', 'should return set value with set()');
      assert.equal(count, 1, 'should have invoked computed property');
      assert.equal(get(obj, 'foo'), 'computed bar', 'should return new value with get()');
    }

    ['@test when not returning from setter, getter is called'](assert) {
      let count = 0;
      class Obj {
        __foo = 'not set';

        @computed()
        get foo() {
          count++;
          return this.__foo;
        }
        set foo(value) {
          this.__foo = `computed ${value}`;
        }
      }
      let obj = new Obj();

      assert.equal(set(obj, 'foo', 'bar'), 'bar', 'should return set value with set()');
      assert.equal(count, 1, 'should have invoked getter');
    }

    ['@test when returning from setter, getter is not called'](assert) {
      let count = 0;
      class Obj {
        __foo = 'not set';

        @computed()
        get foo() {
          count++;
          return this.__foo;
        }
        set foo(value) {
          this.__foo = `computed ${value}`;
          return this.__foo;
        }
      }
      let obj = new Obj();

      assert.equal(set(obj, 'foo', 'bar'), 'bar', 'should return set value with set()');
      assert.equal(count, 0, 'should not have invoked getter');
    }

    ['@test throws if a value is decorated twice']() {
      expectAssertion(() => {
        class Obj {
          @computed
          @computed
          get foo() {
            return this._foo;
          }
        }
        new Obj();
      }, "Only one computed property decorator can be applied to a class field or accessor, but 'foo' was decorated twice. You may have added the decorator to both a getter and setter, which is unecessary.");
    }
  }
);
