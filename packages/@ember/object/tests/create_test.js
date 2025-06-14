import { getFactoryFor, Registry } from '@ember/-internals/container';
import { getOwner, setOwner } from '@ember/-internals/owner';
import { addObserver } from '@ember/object/observers';
import Mixin from '@ember/object/mixin';
import Service, { service } from '@ember/service';
import { DEBUG } from '@glimmer/env';
import EmberObject, { computed, observer } from '@ember/object';
import { alias } from '@ember/object/computed';
import { buildOwner, moduleFor, runDestroy, AbstractTestCase } from 'internal-test-helpers';
import { destroy } from '@glimmer/destroyable';

moduleFor(
  'EmberObject.create',
  class extends AbstractTestCase {
    ['@test simple properties are set'](assert) {
      expectNoDeprecation();

      let o = EmberObject.create({ ohai: 'there' });
      assert.equal(o.get('ohai'), 'there');
    }

    ['@test explicit injection does not raise deprecation'](assert) {
      expectNoDeprecation();

      let owner = buildOwner();

      class FooService extends Service {
        bar = 'foo';
      }
      class FooObject extends EmberObject {
        @service foo;
      }
      owner.register('service:foo', FooService);
      owner.register('foo:main', FooObject);

      let obj = owner.lookup('foo:main');
      assert.equal(obj.foo.bar, 'foo');

      runDestroy(owner);
    }

    ['@test calls computed property setters'](assert) {
      let MyClass = EmberObject.extend({
        foo: computed({
          get() {
            return "this is not the value you're looking for";
          },
          set(key, value) {
            return value;
          },
        }),
      });

      let o = MyClass.create({ foo: 'bar' });
      assert.equal(o.get('foo'), 'bar');
    }

    ['@test sets up mandatory setters for simple properties watched with observers'](assert) {
      if (DEBUG) {
        let MyClass = EmberObject.extend({
          foo: null,
          bar: null,
          fooDidChange: observer('foo', function () {}),
        });

        let o = MyClass.create({ foo: 'bar', bar: 'baz' });
        assert.equal(o.get('foo'), 'bar');

        let descriptor = Object.getOwnPropertyDescriptor(o, 'foo');
        assert.ok(descriptor.set, 'Mandatory setter was setup');

        descriptor = Object.getOwnPropertyDescriptor(o, 'bar');
        assert.ok(!descriptor.set, 'Mandatory setter was not setup');

        o.destroy();
      } else {
        assert.expect(0);
      }
    }

    ['@test sets up mandatory setters for simple properties watched with computeds'](assert) {
      if (DEBUG) {
        let MyClass = class extends EmberObject {
          foo = null;
          bar = null;
          @computed('foo')
          get fooAlias() {
            return this.foo;
          }
        };

        let o = MyClass.create({ foo: 'bar', bar: 'baz' });
        assert.equal(o.get('fooAlias'), 'bar');

        let descriptor = Object.getOwnPropertyDescriptor(o, 'foo');
        assert.ok(descriptor.set, 'Mandatory setter was setup');

        descriptor = Object.getOwnPropertyDescriptor(o, 'bar');
        assert.ok(!descriptor.set, 'Mandatory setter was not setup');

        o.destroy();
      } else {
        assert.expect(0);
      }
    }

    ['@test sets up mandatory setters for simple properties watched with aliases'](assert) {
      if (DEBUG) {
        let MyClass = class extends EmberObject {
          foo = null;
          bar = null;
          @alias('foo')
          fooAlias;
        };

        let o = MyClass.create({ foo: 'bar', bar: 'baz' });
        assert.equal(o.get('fooAlias'), 'bar');

        let descriptor = Object.getOwnPropertyDescriptor(o, 'foo');
        assert.ok(descriptor.set, 'Mandatory setter was setup');

        descriptor = Object.getOwnPropertyDescriptor(o, 'bar');
        assert.ok(!descriptor.set, 'Mandatory setter was not setup');

        o.destroy();
      } else {
        assert.expect(0);
      }
    }

    ['@test does not sets up separate mandatory setters on getters'](assert) {
      if (DEBUG) {
        let MyClass = EmberObject.extend({
          get foo() {
            return 'bar';
          },
          fooDidChange: observer('foo', function () {}),
        });

        let o = MyClass.create({});
        assert.equal(o.get('foo'), 'bar');

        let descriptor = Object.getOwnPropertyDescriptor(o, 'foo');
        assert.ok(!descriptor, 'Mandatory setter was not setup');

        // cleanup
        o.destroy();
      } else {
        assert.expect(0);
      }
    }

    ['@test does not sets up separate mandatory setters on arrays'](assert) {
      if (DEBUG) {
        let arr = [123];

        addObserver(arr, 0, function () {});

        let descriptor = Object.getOwnPropertyDescriptor(arr, 0);
        assert.ok(!descriptor.set, 'Mandatory setter was not setup');

        destroy(arr);
      } else {
        assert.expect(0);
      }
    }

    ['@test calls setUnknownProperty if undefined'](assert) {
      let setUnknownPropertyCalled = false;

      let MyClass = class extends EmberObject {
        setUnknownProperty(/* key, value */) {
          setUnknownPropertyCalled = true;
        }
      };

      MyClass.create({ foo: 'bar' });
      assert.ok(setUnknownPropertyCalled, 'setUnknownProperty was called');
    }

    ['@test throws if you try to define a computed property']() {
      expectAssertion(function () {
        EmberObject.create({
          foo: computed(function () {}),
        });
      }, 'EmberObject.create no longer supports defining computed properties. Define computed properties using extend() or reopen() before calling create().');
    }

    ['@test throws if you try to call _super in a method']() {
      expectAssertion(function () {
        EmberObject.create({
          foo() {
            this._super(...arguments);
          },
        });
      }, 'EmberObject.create no longer supports defining methods that call _super.');
    }

    ["@test throws if you try to 'mixin' a definition"]() {
      let myMixin = Mixin.create({
        adder(arg1, arg2) {
          return arg1 + arg2;
        },
      });

      expectAssertion(function () {
        EmberObject.create(myMixin);
      }, 'EmberObject.create no longer supports mixing in other definitions, use .extend & .create separately instead.');
    }

    ['@test inherits properties from passed in EmberObject'](assert) {
      let baseObj = EmberObject.create({ foo: 'bar' });
      let secondaryObj = EmberObject.create(baseObj);

      assert.equal(
        secondaryObj.foo,
        baseObj.foo,
        'Em.O.create inherits properties from EmberObject parameter'
      );
    }

    ['@test throws if you try to pass anything a string as a parameter']() {
      let expected = 'EmberObject.create only accepts objects.';

      expectAssertion(() => EmberObject.create('some-string'), expected);
    }

    ['@test EmberObject.create can take undefined as a parameter'](assert) {
      let o = EmberObject.create(undefined);
      assert.deepEqual(EmberObject.create(), o);
    }

    ['@test can use getOwner in a proxy init GH#16484'](assert) {
      let owner = {};
      let options = {};
      setOwner(options, owner);

      let ProxyClass = class extends EmberObject {
        init() {
          super.init(...arguments);
          let localOwner = getOwner(this);

          assert.equal(localOwner, owner, 'should be able to `getOwner` in init');
        }
        unknownProperty() {
          return undefined;
        }
      };

      ProxyClass.create(options);
    }

    ['@test does not create enumerable properties for owner and init factory when created by the container factory'](
      assert
    ) {
      let registry = new Registry();
      let container = registry.container();
      container.owner = {};

      registry.register('component:foo-bar', EmberObject);

      let componentFactory = container.factoryFor('component:foo-bar');
      let instance = componentFactory.create();

      assert.deepEqual(Object.keys(instance), [], 'no enumerable properties were added');
      assert.equal(getOwner(instance), container.owner, 'owner was defined on the instance');
      assert.ok(getFactoryFor(instance), 'factory was defined on the instance');
    }

    ['@test does not create enumerable properties for owner and init factory when looked up on the container'](
      assert
    ) {
      let registry = new Registry();
      let container = registry.container();
      container.owner = {};

      registry.register('component:foo-bar', EmberObject);

      let instance = container.lookup('component:foo-bar');

      assert.deepEqual(Object.keys(instance), [], 'no enumerable properties were added');
      assert.equal(getOwner(instance), container.owner, 'owner was defined on the instance');
      assert.ok(getFactoryFor(instance), 'factory was defined on the instance');
    }
  }
);
