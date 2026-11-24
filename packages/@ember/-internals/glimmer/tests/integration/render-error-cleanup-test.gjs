import { renderComponent } from '@ember/renderer';
import { registerDestructor } from '@ember/destroyable';
import { run } from '@ember/runloop';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { isTracking, resetTracking } from '@glimmer/validator';
import { DEBUG } from '@glimmer/env';
import { module, test } from 'qunit';
import { resetOnerror, settled, setupOnerror } from '@ember/test-helpers';
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
  });

  test('a first render that throws destroys what it made before the error', async function (assert) {
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

    assert.throws(() => {
      renderComponent(
        <template>
          <Child />
          <Boom />
        </template>,
        { into: this.element, owner: this.owner }
      );
    }, /boom/);

    await settled();

    assert.verifySteps(['child created', 'child destroyed']);
  });

  test('a block render that throws destroys what it made before the error', async function (assert) {
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

    renderComponent(
      <template>
        {{#if state.show}}
          <Child />
          <Boom />
        {{/if}}
      </template>,
      { into: this.element, owner: this.owner }
    );

    /**
     * Without `onerror`, backburner drops the rest of the run loop
     * after an error, and the destructors are in that run loop.
     */
    setupOnerror((error) => assert.step(`onerror: ${error.message}`));

    run(() => (state.show = true));

    await settled();
    resetOnerror();

    assert.verifySteps(['child created', 'onerror: boom', 'child destroyed']);
  });
});
