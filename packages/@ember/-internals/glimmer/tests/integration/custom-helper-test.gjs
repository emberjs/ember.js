import { RenderingTestCase, moduleFor } from 'internal-test-helpers';
import { Helper } from '../../index';

moduleFor(
  'Custom Helper test',
  class extends RenderingTestCase {
    ['@test works with strict-mode']() {
      class Custom extends Helper {
        compute([value]) {
          return `${value}-custom`;
        }
      }

      let TestComponent = <template>{{ (Custom 'my-test') }}</template>
      this.render(`<this.TestComponent />`, { TestComponent });
      this.assertText('my-test-custom');
      this.assertStableRerender();
    }
  }
);
