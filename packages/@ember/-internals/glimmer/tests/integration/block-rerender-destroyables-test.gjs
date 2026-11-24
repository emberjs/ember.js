import { renderComponent } from '@ember/renderer';
import { setOnerror } from '@ember/-internals/error-handling';
import { run } from '@ember/runloop';
import Component from '@glimmer/component';
import {
  assertDestroyablesDestroyed,
  destroy,
  enableDestroyableTracking,
  registerDestructor,
} from '@ember/destroyable';
import { tracked } from '@glimmer/tracking';
import { DEBUG } from '@glimmer/env';
import { module, test } from 'qunit';
import { settled } from '@ember/test-helpers';

/**
 * `enableDestroyableTracking()` replaces the whole destroyable registry.
 * Anything made before it, such as the owner of `setupRenderingTest`,
 * loses its destructors.
 *
 * So this module has no setup,
 * and each test makes its owner and element after the tracking starts.
 */
module('block rerender destroyables', function () {
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
    let element = document.createElement('div');

    document.querySelector('#qunit-fixture').append(element);

    try {
      let result = renderComponent(
        <template>
          {{#if state.show}}shown{{/if}}
          {{#each state.items as |item|}}<span>{{item}}</span>{{/each}}
        </template>,
        { into: element, owner }
      );

      state.show = true;
      state.items = ['a', 'b'];
      await settled();
      assert.step(element.textContent.replace(/\s+/g, ' ').trim());

      state.show = false;
      state.items = ['b', 'c'];
      await settled();
      assert.step(element.textContent.replace(/\s+/g, ' ').trim());

      result.destroy();
      destroy(owner);
      await settled();
    } finally {
      assertDestroyablesDestroyed();
    }

    assert.verifySteps(['shown ab', 'bc']);
  });

  test('a block that throws while it renders again leaves nothing undestroyed', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    class State {
      @tracked show = false;
    }

    let state = new State();

    class Child extends Component {
      constructor(owner, args) {
        super(owner, args);
        assert.step('child created');
        registerDestructor(this, () => assert.step('child destroyed'));
      }
    }

    class Boom extends Component {
      constructor(owner, args) {
        super(owner, args);
        throw new Error('boom');
      }
    }

    enableDestroyableTracking();

    let owner = {};
    let element = document.createElement('div');

    document.querySelector('#qunit-fixture').append(element);

    /**
     * Without `onerror`, backburner drops the rest of the run loop
     * after an error, and the destructors are in that run loop.
     */
    setOnerror((error) => assert.step(`onerror: ${error.message}`));

    try {
      let result = renderComponent(
        <template>
          {{#if state.show}}
            <Child />
            <Boom />
          {{/if}}
        </template>,
        { into: element, owner }
      );

      run(() => (state.show = true));
      await settled();

      result.destroy();
      destroy(owner);
      await settled();
    } finally {
      setOnerror(undefined);
      assertDestroyablesDestroyed();
    }

    assert.verifySteps(['child created', 'onerror: boom', 'child destroyed']);
  });
});
