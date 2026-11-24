import { renderComponent } from '@ember/renderer';
import {
  assertDestroyablesDestroyed,
  destroy,
  enableDestroyableTracking,
} from '@ember/destroyable';
import { tracked } from '@glimmer/tracking';
import { DEBUG } from '@glimmer/env';
import { module, test } from 'qunit';
import { settled } from '@ember/test-helpers';
import { setupRenderingTest } from 'ember-qunit';

module('block rerender destroyables', function (hooks) {
  setupRenderingTest(hooks);

  test('blocks that render again leave nothing undestroyed', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    class State {
      @tracked show = false;
      @tracked items = [];
    }

    let state = new State();

    enableDestroyableTracking();

    /**
     * The renderer lives as long as its owner.
     * This owner lives only in this test, so the check covers the renderer too.
     */
    let owner = {};

    try {
      let result = renderComponent(
        <template>
          {{#if state.show}}shown{{/if}}
          {{#each state.items as |item|}}<span>{{item}}</span>{{/each}}
        </template>,
        { into: this.element, owner }
      );

      state.show = true;
      state.items = ['a', 'b'];
      await settled();
      assert.step(this.element.textContent.replace(/\s+/g, ' ').trim());

      state.show = false;
      state.items = ['b', 'c'];
      await settled();
      assert.step(this.element.textContent.replace(/\s+/g, ' ').trim());

      result.destroy();
      destroy(owner);
      await settled();
    } finally {
      assertDestroyablesDestroyed();
    }

    assert.verifySteps(['shown ab', 'bc']);
  });
});
