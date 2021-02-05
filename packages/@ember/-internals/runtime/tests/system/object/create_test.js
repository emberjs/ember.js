import { getFactoryFor, Registry } from '@ember/-internals/container';
import { inspect } from '@ember/-internals/utils';
import { getOwner, setOwner } from '@ember/-internals/owner';
import { computed, Mixin, observer, addObserver, alias, tracked } from '@ember/-internals/metal';
import Service, { inject as service } from '@ember/service';
import { DEBUG } from '@glimmer/env';
import EmberObject from '../../../lib/system/object';
import { buildOwner, moduleFor, AbstractTestCase } from 'internal-test-helpers';
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
    }

    ['@test implicit injections raises deprecation'](assert) {
      let owner = buildOwner();

      class FooService extends Service {
        bar = 'foo';
      }
      class FooObject extends EmberObject {}
      owner.register('service:foo', FooService);
      owner.register('foo:main', FooObject);
      owner.inject('foo:main', 'foo', 'service:foo');

      let obj = owner.lookup('foo:main');
      let result;
      expectDeprecation(
        () => (result = obj.foo),
        `A value was injected implicitly on the 'foo' property of an instance of ${inspect(
          obj
        )}. Implicit injection is now deprecated, please add an explicit injection for this value. If the injected value is a service, consider using the @service decorator.`
      );

      assert.equal(result.bar, 'foo');
      assert.equal(obj.foo.bar, 'foo');
    }

    ['@test implicit injections raises deprecation for old style EmberObject'](assert) {
      let owner = buildOwner();

      class FooService extends Service {
        bar = 'foo';
      }
      let FooObject = EmberObject.extend();
      owner.register('service:foo', FooService);
      owner.register('foo:main', FooObject);
      owner.inject('foo:main', 'foo', 'service:foo');

      let obj = owner.lookup('foo:main');
      let result;
      expectDeprecation(
        () => (result = obj.foo),
        `A value was injected implicitly on the 'foo' property of an instance of ${inspect(
          obj
        )}. Implicit injection is now deprecated, please add an explicit injection for this value. If the injected value is a service, consider using the @service decorator.`
      );

      assert.equal(result.bar, 'foo');
      assert.equal(obj.foo.bar, 'foo');
    }

    ['@test implicit injections does not raise a deprecation if explicit injection present'](
      assert
    ) {
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
      owner.inject('foo:main', 'foo', 'service:foo');

      let obj = owner.lookup('foo:main');
      assert.equal(obj.foo.bar, 'foo');
    }

    ['@test raises deprecation if explicit injection is not the same as the implicit injection'](
      assert
    ) {
      let owner = buildOwner();

      class FooService extends Service {
        bar = 'foo';
      }
      class BarService extends Service {
        bar = 'bar';
      }
      class FooObject extends EmberObject {
        @service foo;
      }
      owner.register('service:foo', FooService);
      owner.register('service:bar', BarService);
      owner.register('foo:main', FooObject);
      owner.inject('foo:main', 'foo', 'service:bar');

      let result;
      expectDeprecation(
        () => (result = owner.lookup('foo:main')),
        /You have explicitly defined a service injection for the 'foo' property on <.*>. However, a different service or value was injected via implicit injections which overrode your explicit injection. Implicit injections have been deprecated, and will be removed in the near future. In order to prevent breakage, you should inject the same value explicitly that is currently being injected implicitly./
      );
      assert.equal(result.foo.bar, 'bar');
    }

    ['@test does not raise deprecation if descriptor is a value and equal to the implicit deprecation'](
      assert
    ) {
      expectNoDeprecation();

      let owner = buildOwner();

      class FooService extends Service {
        bar = 'foo';
      }
      class BarService extends Service {
        bar = 'bar';
      }
      class FooObject extends EmberObject {
        foo = getOwner(this).lookup('service:foo');
      }
      owner.register('service:foo', FooService);
      owner.register('service:bar', BarService);
      owner.register('foo:main', FooObject);
      owner.inject('foo:main', 'foo', 'service:foo');

      let result = owner.lookup('foo:main');
      assert.equal(result.foo.bar, 'foo');
    }

    ['@test does raise deprecation if descriptor is a value and not equal to the implicit deprecation'](
      assert
    ) {
      let owner = buildOwner();

      class FooService extends Service {
        bar = 'foo';
      }
      class BarService extends Service {
        bar = 'bar';
      }
      class FooObject extends EmberObject {
        foo = getOwner(this).lookup('service:foo');
      }
      owner.register('service:foo', FooService);
      owner.register('service:bar', BarService);
      owner.register('foo:main', FooObject);
      owner.inject('foo:main', 'foo', 'service:bar');

      expectDeprecation(() => {
        let result = owner.lookup('foo:main');
        assert.equal(result.foo.bar, 'bar');
      }, /A value was injected implicitly on the 'foo' property of an instance of <.*>, overwriting the original value which was <.*>. Implicit injection is now deprecated, please add an explicit injection for this value/);
    }

    ['@test does not raise deprecation if descriptor is a tracked property and equal to the implicit deprecation'](
      assert
    ) {
      expectNoDeprecation();

      let owner = buildOwner();

      class FooService extends Service {
        bar = 'foo';
      }
      class BarService extends Service {
        bar = 'bar';
      }
      class FooObject extends EmberObject {
        @tracked foo = getOwner(this).lookup('service:foo');
      }
      owner.register('service:foo', FooService);
      owner.register('service:bar', BarService);
      owner.register('foo:main', FooObject);
      owner.inject('foo:main', 'foo', 'service:foo');

      let result = owner.lookup('foo:main');
      assert.equal(result.foo.bar, 'foo');
    }

    ['@test does raise deprecation if descriptor is a tracked property and not equal to the implicit deprecation'](
      assert
    ) {
      let owner = buildOwner();

      class FooService extends Service {
        bar = 'foo';
      }
      class BarService extends Service {
        bar = 'bar';
      }
      class FooObject extends EmberObject {
        @tracked foo = getOwner(this).lookup('service:foo');
      }
      owner.register('service:foo', FooService);
      owner.register('service:bar', BarService);
      owner.register('foo:main', FooObject);
      owner.inject('foo:main', 'foo', 'service:bar');

      expectDeprecation(() => {
        let result = owner.lookup('foo:main');
        assert.equal(result.foo.bar, 'bar');
      }, /A value was injected implicitly on the 'foo' tracked property of an instance of <.*>, overwriting the original value which was <.*>. Implicit injection is now deprecated, please add an explicit injection for this value/);
    }

    ['@test does not raise deprecation if descriptor is a computed property with a setter'](
      assert
    ) {
      expectNoDeprecation();

      let owner = buildOwner();

      class FooService extends Service {
        bar = 'foo';
      }
      class BarService extends Service {
        bar = 'bar';
      }
      class FooObject extends EmberObject {
        @computed
        get foo() {
          return getOwner(this).lookup('service:foo');
        }

        set foo(val) {}
      }
      owner.register('service:foo', FooService);
      owner.register('service:bar', BarService);
      owner.register('foo:main', FooObject);
      owner.inject('foo:main', 'foo', 'service:foo');

      let result = owner.lookup('foo:main');
      assert.equal(result.foo.bar, 'foo');
    }

    ['@test does raise deprecation if descriptor is a computed property without a setter'](assert) {
      let owner = buildOwner();

      class FooService extends Service {
        bar = 'foo';
      }
      class BarService extends Service {
        bar = 'bar';
      }
      class FooObject extends EmberObject {
        @computed
        get foo() {
          return getOwner(this).lookup('service:foo');
        }
      }
      owner.register('service:foo', FooService);
      owner.register('service:bar', BarService);
      owner.register('foo:main', FooObject);
      owner.inject('foo:main', 'foo', 'service:bar');

      expectDeprecation(
        /The <.*>#foo computed property was just overridden. This removes the computed property and replaces it with a plain value, and has been deprecated. If you want this behavior, consider defining a setter which does it manually./
      );

      expectDeprecation(
        /A value was injected implicitly on the 'foo' computed property of an instance of <.*>. Implicit injection is now deprecated, please add an explicit injection for this value/
      );

      let result = owner.lookup('foo:main');
      assert.equal(result.foo.bar, 'bar');
    }

    ['@test does not raise deprecation if descriptor is a getter and equal to the implicit deprecation'](
      assert
    ) {
      expectNoDeprecation();

      let owner = buildOwner();

      class FooService extends Service {
        bar = 'foo';
      }
      class BarService extends Service {
        bar = 'bar';
      }
      class FooObject extends EmberObject {
        get foo() {
          return getOwner(this).lookup('service:foo');
        }

        set foo(_) {}
      }
      owner.register('service:foo', FooService);
      owner.register('service:bar', BarService);
      owner.register('foo:main', FooObject);
      owner.inject('foo:main', 'foo', 'service:foo');

      let result = owner.lookup('foo:main');
      assert.equal(result.foo.bar, 'foo');
    }

    ['@test does not raise deprecation if descriptor is a getter and not equal to the implicit deprecation'](
      assert
    ) {
      let owner = buildOwner();

      class FooService extends Service {
        bar = 'foo';
      }
      class BarService extends Service {
        bar = 'bar';
      }
      class FooObject extends EmberObject {
        get foo() {
          return getOwner(this).lookup('service:foo');
        }

        set foo(_) {}
      }
      owner.register('service:foo', FooService);
      owner.register('service:bar', BarService);
      owner.register('foo:main', FooObject);
      owner.inject('foo:main', 'foo', 'service:bar');

      let result = owner.lookup('foo:main');
      assert.equal(result.foo.bar, 'foo');
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
        let MyClass = EmberObject.extend({
          foo: null,
          bar: null,
          fooAlias: computed('foo', function () {
            return this.foo;
          }),
        });

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
        let MyClass = EmberObject.extend({
          foo: null,
          bar: null,
          fooAlias: alias('foo'),
        });

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

      let MyClass = EmberObject.extend({
        setUnknownProperty(/* key, value */) {
          setUnknownPropertyCalled = true;
        },
      });

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

      EmberObject.extend({
        init() {
          this._super(...arguments);
          let localOwner = getOwner(this);

          assert.equal(localOwner, owner, 'should be able to `getOwner` in init');
        },
        unknownProperty() {
          return undefined;
        },
      }).create(options);
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
