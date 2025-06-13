import { get, set } from '@ember/object';
import CoreObject from '@ember/object/core';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';
import { track } from '@glimmer/validator';
import { destroy } from '@glimmer/destroyable';
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
