import { renderComponent } from '@ember/renderer';
import { isTracking, resetTracking } from '@glimmer/validator';
import { DEBUG } from '@glimmer/env';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';

module('render error cleanup', function (hooks) {
  setupRenderingTest(hooks);

  /**
   * An open tracking frame makes each later test fail.
   */
  hooks.afterEach(() => {
    resetTracking();
  });

  test('a render error whose cleanup throws still resets tracking [GH#21681]', function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    let element = document.createElement('div');
    let marker = document.createComment('');

    element.append(marker);
    this.element.append(element);

    let into = { element, nextSibling: marker };

    /**
     * The cursor is now stale.
     * The render fails at its first insert before `marker`,
     * and the VM fails again when it closes the open block.
     */
    element.innerHTML = '';

    assert.throws(() => {
      renderComponent(<template>hello</template>, { into, owner: this.owner });
    }, /insertBefore/);

    assert.false(isTracking(), 'no tracking frame is left open');
  });
});
