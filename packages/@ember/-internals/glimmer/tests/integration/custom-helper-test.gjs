import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import Helper from '@ember/component/helper';

module('Custom Helper test', function (hooks) {
  setupRenderingTest(hooks);

  test('works with strict-mode', async function (assert) {
    class Custom extends Helper {
      compute([value]) {
        return `${value}-custom`;
      }
    }

    await render(<template>{{(Custom "my-test")}}</template>);

    await assert.stableRender('my-test-custom');
  });
});
