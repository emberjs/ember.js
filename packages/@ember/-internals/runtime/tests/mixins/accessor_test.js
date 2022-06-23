import EmberObject from '@ember/object';
import { moduleFor, RenderingTestCase } from 'internal-test-helpers';

moduleFor(
  'runtime: Mixin Accessors',
  class extends RenderingTestCase {
    ['@test works with getters'](assert) {
      let Base = EmberObject.extend({
        get foo() {
          throw new Error('base-foo getter');
        },
      });

      Base.proto();

      class Zebra extends Base {
        get foo() {
          throw new Error('zebra-foo getter');
        }
      }

      Zebra.proto();

      let Final = Zebra.extend({
        get foo() {
          throw new Error('final-foo getter');
        },
      });

      Final.create();

      assert.ok(true, 'no error thrown while merging mixin with getter');
    }
  }
);
