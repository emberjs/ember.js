import { getOwner, setOwner } from '@ember/-internals/owner';
import { computed, Mixin, observer } from '@ember/-internals/metal';
import { DEBUG } from '@glimmer/env';
import EmberObject from '../../../lib/system/object';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'EmberObject.create',
  class extends AbstractTestCase {
    ['@test simple properties are set'](assert) {
      let o = EmberObject.create({ ohai: 'there' });
      assert.equal(o.get('ohai'), 'there');
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

    ['@test sets up mandatory setters for watched simple properties'](assert) {
      if (DEBUG) {
        let MyClass = EmberObject.extend({
          foo: null,
          bar: null,
          fooDidChange: observer('foo', function() {}),
        });

        let o = MyClass.create({ foo: 'bar', bar: 'baz' });
        assert.equal(o.get('foo'), 'bar');

        let descriptor = Object.getOwnPropertyDescriptor(o, 'foo');
        assert.ok(descriptor.set, 'Mandatory setter was setup');

        descriptor = Object.getOwnPropertyDescriptor(o, 'bar');
        assert.ok(!descriptor.set, 'Mandatory setter was not setup');
      } else {
        assert.expect(0);
      }
    }

    ['@test calls setUnknownProperty if defined'](assert) {
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
      expectAssertion(function() {
        EmberObject.create({
          foo: computed(function() {}),
        });
      }, 'EmberObject.create no longer supports defining computed properties. Define computed properties using extend() or reopen() before calling create().');
    }

    ['@test throws if you try to call _super in a method']() {
      expectAssertion(function() {
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

      expectAssertion(function() {
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
  }
);
