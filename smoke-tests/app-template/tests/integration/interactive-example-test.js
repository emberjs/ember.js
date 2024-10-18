import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click } from '@ember/test-helpers';
import { template } from '@ember/template-compiler';
import InteractiveExample from 'ember-test-app/components/interactive-example';

module('Integration | component | interactive-example', function(hooks) {
  setupRenderingTest(hooks);

  test('initial render', async function(assert) {
    await render(template("<InteractiveExample />", {
      scope: () => ({ InteractiveExample })
    }));
    assert.dom('.interactive-example').hasText('Hello');
  });

  test('interactive update', async function(assert) {
    await render(template("<InteractiveExample />", {
      scope: () => ({ InteractiveExample })
    }));
    await click('.interactive-example');
    assert.dom('.interactive-example').hasText('Hello!');
  });

});
