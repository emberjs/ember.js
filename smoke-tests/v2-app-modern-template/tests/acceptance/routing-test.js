import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import { visit, click, currentURL } from '@ember/test-helpers';

module('Acceptance | routing', function (hooks) {
  setupApplicationTest(hooks);

  test('routing, LinkTo, and query params work end to end', async function (assert) {
    const router = this.owner.lookup('service:router');
    const visited = [];
    const record = (transition) => visited.push(transition.to?.name);
    router.on('routeDidChange', record);

    try {
      await visit('/');
      const controller = this.owner.lookup('controller:index');
      assert.strictEqual(controller.sort, 'asc', 'controller QP default');
      assert.dom('[data-test-sort]').hasText('asc');

      await click('[data-test-to-about]');
      assert.strictEqual(currentURL(), '/about');
      assert.dom('[data-test-about]').exists();

      await click('[data-test-back-sorted]');
      assert.strictEqual(currentURL(), '/?sort=desc');
      assert.dom('[data-test-sort]').hasText('desc');

      assert.deepEqual(visited, ['index', 'about', 'index']);
    } finally {
      router.off('routeDidChange', record);
    }
  });
});
