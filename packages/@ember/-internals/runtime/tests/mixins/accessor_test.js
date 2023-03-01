import EmberObject from '@ember/object';
import { moduleFor, RenderingTestCase } from 'internal-test-helpers';

moduleFor(
  'runtime: Mixin Accessors',
  class extends RenderingTestCase {
    ['@test works with getters'](assert) {
      let value = 'building';

      let Base = EmberObject.extend({
        get foo() {
          if (value === 'building') {
            throw Error('base should not be called yet');
          }

          return "base's foo";
        },
      });

      // force Base to be finalized so its properties will contain `foo`
      Base.proto();

      class Child extends Base {
        get foo() {
          if (value === 'building') {
            throw Error('child should not be called yet');
          }

          return "child's foo";
        }
      }

      Child.proto();

      let Grandchild = Child.extend({
        get foo() {
          if (value === 'building') {
            throw Error('grandchild should not be called yet');
          }

          return value;
        },
      });

      let instance = Grandchild.create();

      value = 'done building';

      assert.equal(instance.foo, 'done building', 'getter defined correctly');

      value = 'changed value';

      assert.equal(instance.foo, 'changed value', 'the value is a real getter, not a snapshot');
    }
  }
);
