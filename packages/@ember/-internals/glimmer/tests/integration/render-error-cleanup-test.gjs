import { renderComponent } from '@ember/renderer';
import { isTracking, resetTracking } from '@glimmer/validator';
import { DEBUG } from '@glimmer/env';
import { getElement, moduleFor, RenderingTestCase } from 'internal-test-helpers';

moduleFor(
  'render error cleanup',
  class extends RenderingTestCase {
    /**
     * An open tracking frame makes each later test fail.
     */
    afterEach() {
      resetTracking();
      super.afterEach();
    }

    '@test a render error whose cleanup throws still resets tracking [GH#21681]'(assert) {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      let element = document.createElement('div');
      let marker = document.createComment('');

      element.append(marker);
      getElement().append(element);

      let into = { element, nextSibling: marker };

      /**
       * The cursor is now stale.
       * The render fails at its first insert before `marker`,
       * and the VM fails again when it closes the open block.
       */
      element.innerHTML = '';

      /**
       * The message text of this error differs between browsers.
       */
      assert.throws(
        () => {
          renderComponent(<template>hello</template>, { into, owner: this.owner });
        },
        (error) => error.name === 'NotFoundError'
      );

      assert.false(isTracking(), 'no tracking frame is left open');
    }
  }
);
