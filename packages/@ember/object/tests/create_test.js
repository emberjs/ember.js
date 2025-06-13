import { getFactoryFor, Registry } from '@ember/-internals/container';
import { getOwner } from '@ember/-internals/owner';
import { addObserver } from '@ember/object/observers';
import Service, { service } from '@ember/service';
import { DEBUG } from '@glimmer/env';
import { computed, get } from '@ember/object';
import CoreObject from '@ember/object/core';
import { alias } from '@ember/object/computed';
import { buildOwner, moduleFor, runDestroy, AbstractTestCase } from 'internal-test-helpers';
import { destroy } from '@glimmer/destroyable';

moduleFor(
  'CoreObject.create',
  class extends AbstractTestCase {
    ['@test simple properties are set'](assert) {
      expectNoDeprecation();

      let o = CoreObject.create({ ohai: 'there' });
      assert.equal(get(o, 'ohai'), 'there');
    }

    ['@test explicit injection does not raise deprecation'](assert) {
      expectNoDeprecation();

      let owner = buildOwner();

      class FooService extends Service {
        bar = 'foo';
      }
      class FooObject extends CoreObject {
        @service foo;
      }
      owner.register('service:foo', FooService);
      owner.register('foo:main', FooObject);

      let obj = owner.lookup('foo:main');
      assert.equal(obj.foo.bar, 'foo');

      runDestroy(owner);
    }

    ['@test calls computed property setters'](assert) {
      let MyClass = class extends CoreObject {
        @computed
        get foo() {
          return this._foo;
        }
        set foo(value) {
          this._foo = value;
        }
      };

      let o = MyClass.create({ foo: 'bar' });
      assert.equal(get(o, 'foo'), 'bar');
    }

    // TODO: Determine if there's anything useful to test here with observer helper gone
    // ['@test sets up mandatory setters for simple properties watched with observers'](assert) {
    //   if (DEBUG) {
    //     let MyClass = EmberObject.extend({
    //       foo: null,
    //       bar: null,
    //       fooDidChange: observer('foo', function () {}),
    //     });

    //     let o = MyClass.create({ foo: 'bar', bar: 'baz' });
    //     assert.equal(o.get('foo'), 'bar');

    //     let descriptor = Object.getOwnPropertyDescriptor(o, 'foo');
    //     assert.ok(descriptor.set, 'Mandatory setter was setup');

    //     descriptor = Object.getOwnPropertyDescriptor(o, 'bar');
    //     assert.ok(!descriptor.set, 'Mandatory setter was not setup');

    //     o.destroy();
    //   } else {
    //     assert.expect(0);
    //   }
    // }

    ['@test sets up mandatory setters for simple properties watched with computeds'](assert) {
      if (DEBUG) {
        let MyClass = class extends CoreObject {
          foo = null;
          bar = null;
          @computed('foo')
          get fooAlias() {
            return this.foo;
          }
        };

        let o = MyClass.create({ foo: 'bar', bar: 'baz' });
        assert.equal(get(o, 'fooAlias'), 'bar');

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
        let MyClass = class extends CoreObject {
          foo = null;
          bar = null;
          @alias('foo')
          fooAlias;
        };

        let o = MyClass.create({ foo: 'bar', bar: 'baz' });
        assert.equal(get(o, 'fooAlias'), 'bar');

        let descriptor = Object.getOwnPropertyDescriptor(o, 'foo');
        assert.ok(descriptor.set, 'Mandatory setter was setup');

        descriptor = Object.getOwnPropertyDescriptor(o, 'bar');
        assert.ok(!descriptor.set, 'Mandatory setter was not setup');

        o.destroy();
      } else {
        assert.expect(0);
      }
    }

    // TODO: Determine if there's anything useful to test here with observer helper gone
    // ['@test does not sets up separate mandatory setters on getters'](assert) {
    //   if (DEBUG) {
    //     let MyClass = EmberObject.extend({
    //       get foo() {
    //         return 'bar';
    //       },
    //       fooDidChange: observer('foo', function () {}),
    //     });

    //     let o = MyClass.create({});
    //     assert.equal(o.get('foo'), 'bar');

    //     let descriptor = Object.getOwnPropertyDescriptor(o, 'foo');
    //     assert.ok(!descriptor, 'Mandatory setter was not setup');

    //     // cleanup
    //     o.destroy();
    //   } else {
    //     assert.expect(0);
    //   }
    // }

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

    ['@test throws if you try to define a computed property']() {
      expectAssertion(function () {
        CoreObject.create({
          foo: computed(function () {}),
        });
      }, 'EmberObject.create no longer supports defining computed properties. Define computed properties in the class definition.');
    }

    ['@test inherits properties from passed in CoreObject'](assert) {
      let baseObj = CoreObject.create({ foo: 'bar' });
      let secondaryObj = CoreObject.create(baseObj);

      assert.equal(
        secondaryObj.foo,
        baseObj.foo,
        'Em.O.create inherits properties from CoreObject parameter'
      );
    }

    ['@test throws if you try to pass anything a string as a parameter']() {
      let expected = 'EmberObject.create only accepts objects.';

      expectAssertion(() => CoreObject.create('some-string'), expected);
    }

    ['@test CoreObject.create can take undefined as a parameter'](assert) {
      let o = CoreObject.create(undefined);
      assert.deepEqual(CoreObject.create(), o);
    }

    ['@test does not create enumerable properties for owner and init factory when created by the container factory'](
      assert
    ) {
      let registry = new Registry();
      let container = registry.container();
      container.owner = {};

      registry.register('component:foo-bar', CoreObject);

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

      registry.register('component:foo-bar', CoreObject);

      let instance = container.lookup('component:foo-bar');

      assert.deepEqual(Object.keys(instance), [], 'no enumerable properties were added');
      assert.equal(getOwner(instance), container.owner, 'owner was defined on the instance');
      assert.ok(getFactoryFor(instance), 'factory was defined on the instance');
    }
  }
);
