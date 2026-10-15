import DataAdapter from '@ember/debug/data-adapter';
import { DEPRECATIONS } from '@ember/-internals/deprecations';
import {
  moduleFor,
  ApplicationTestCase,
  expectDeprecation,
  expectNoDeprecation,
  testUnless,
  testIf,
} from 'internal-test-helpers';

const { isEnabled, isRemoved } = DEPRECATIONS.DEPRECATE_EMBER_ARRAY_A;

class TestDataAdapter extends DataAdapter {
  getModelTypes() {
    return [];
  }
}

moduleFor(
  'DataAdapter releaseMethods',
  class extends ApplicationTestCase {
    constructor() {
      super(...arguments);
      this.add('data-adapter:main', TestDataAdapter);
    }

    async adapter() {
      await this.visit('/');
      return this.applicationInstance.lookup('data-adapter:main');
    }

    async ['@test releaseMethods is a native array'](assert) {
      let adapter = await this.adapter();

      assert.ok(Array.isArray(adapter.releaseMethods));
      assert.deepEqual(Object.keys(adapter.releaseMethods), []);

      expectNoDeprecation(() => {
        let release = adapter.watchModelTypes(
          () => {},
          () => {}
        );

        assert.strictEqual(adapter.releaseMethods.length, 1);
        release();
        assert.strictEqual(adapter.releaseMethods.length, 0);
      });
    }

    async [`${testUnless(isRemoved)} @test releaseMethods supports pushObject and removeObject`](
      assert
    ) {
      let adapter = await this.adapter();
      let release = () => {};

      expectDeprecation(
        () => {
          assert.strictEqual(adapter.releaseMethods.pushObject(release), release);
        },
        /`releaseMethods.pushObject` was used on a `DataAdapter`/,
        isEnabled
      );
      assert.deepEqual(adapter.releaseMethods.slice(), [release]);

      expectDeprecation(
        () => {
          assert.strictEqual(adapter.releaseMethods.removeObject(release), adapter.releaseMethods);
        },
        /`releaseMethods.removeObject` was used on a `DataAdapter`/,
        isEnabled
      );
      assert.deepEqual(adapter.releaseMethods.slice(), []);
    }

    async [`${testIf(isRemoved)} @test releaseMethods has no Ember array methods`](assert) {
      let adapter = await this.adapter();

      assert.strictEqual(adapter.releaseMethods.pushObject, undefined);
      assert.strictEqual(adapter.releaseMethods.removeObject, undefined);
    }
  }
);
