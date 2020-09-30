import { getOwner, setOwner } from '@ember/-internals/owner';
import { get, set, observer } from '@ember/-internals/metal';
import CoreObject from '../../lib/system/core_object';
import { moduleFor, AbstractTestCase, buildOwner, runLoopSettled } from 'internal-test-helpers';
import { track } from '@glimmer/validator';
import { destroy } from '@glimmer/runtime';
import { run } from '@ember/runloop';

moduleFor(
  'Ember.CoreObject',
  class extends AbstractTestCase {
    ['@test toString should be not be added as a property when calling toString()'](assert) {
      let obj = CoreObject.create({
        firstName: 'Foo',
        lastName: 'Bar',
      });

      obj.toString();

      assert.notOk(
        Object.prototype.hasOwnProperty.call(obj, 'toString'),
        'Calling toString() should not create a toString class property'
      );
    }

    ['@test should not trigger proxy assertion when retrieving a proxy with (GH#16263)'](assert) {
      let someProxyishThing = CoreObject.extend({
        unknownProperty() {
          return true;
        },
      }).create();

      let obj = CoreObject.create({
        someProxyishThing,
      });

      let proxy = get(obj, 'someProxyishThing');
      assert.equal(get(proxy, 'lolol'), true, 'should be able to get data from a proxy');
    }

    ['@test should not trigger proxy assertion when retrieving a re-registered proxy (GH#16610)'](
      assert
    ) {
      let owner = buildOwner();

      let someProxyishThing = CoreObject.extend({
        unknownProperty() {
          return true;
        },
      }).create();

      // emulates ember-engines's process of registering services provided
      // by the host app down to the engine
      owner.register('thing:one', someProxyishThing, { instantiate: false });

      assert.equal(owner.lookup('thing:one'), someProxyishThing);
    }

    ['@test should not trigger proxy assertion when probing for a "symbol"'](assert) {
      let proxy = CoreObject.extend({
        unknownProperty() {
          return true;
        },
      }).create();

      assert.equal(get(proxy, 'lolol'), true, 'should be able to get data from a proxy');

      // should not trigger an assertion
      getOwner(proxy);
    }

    ['@test can use getOwner in a proxy init GH#16484'](assert) {
      let owner = {};
      let options = {};
      setOwner(options, owner);

      CoreObject.extend({
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

    async ['@test observed properties are enumerable when set GH#14594'](assert) {
      let callCount = 0;
      let Test = CoreObject.extend({
        myProp: null,
        anotherProp: undefined,
        didChangeMyProp: observer('myProp', function () {
          callCount++;
        }),
      });

      let test = Test.create();
      set(test, 'id', '3');
      set(test, 'myProp', { id: 1 });

      assert.deepEqual(Object.keys(test).sort(), ['id', 'myProp']);

      set(test, 'anotherProp', 'nice');

      assert.deepEqual(Object.keys(test).sort(), ['anotherProp', 'id', 'myProp']);
      await runLoopSettled();

      assert.equal(callCount, 1);

      test.destroy();
    }

    ['@test native getters/setters do not cause rendering invalidation during init'](assert) {
      let objectMeta = Object.create(null);

      class TestObject extends CoreObject {
        get hiddenValue() {
          let v = get(objectMeta, 'hiddenValue');
          return v !== undefined ? v : false;
        }
        set hiddenValue(v) {
          set(objectMeta, 'hiddenValue', v);
        }
      }

      track(() => {
        TestObject.create({ hiddenValue: true });
        assert.ok(true, 'We did not error');
      });
    }
    '@test destroy method is called when being destroyed by @ember/destroyable'(assert) {
      assert.expect(1);

      class TestObject extends CoreObject {
        destroy() {
          assert.ok(true, 'destroy was invoked');
        }
      }

      let instance = TestObject.create();

      run(() => {
        destroy(instance);
      });
    }
  }
);
