import { tracked } from '@glimmer/tracking';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { renderSettled } from '@ember/renderer';
import { run, schedule } from '@ember/runloop';

class State {
  @tracked foo = 'bar';
}

module('renderSettled', function (hooks) {
  setupRenderingTest(hooks);

  test('resolves when no rendering is happening', async function (assert) {
    await renderSettled();

    assert.ok(true, 'resolved even without rendering');
  });

  test('resolves renderers exist but no runloops are triggered', async function (assert) {
    let state = new State();

    await render(<template>{{state.foo}}</template>);

    await renderSettled();

    assert.ok(true, 'resolved even without runloops');
  });

  test('does not create extraneous promises', async function (assert) {
    let first = renderSettled();
    let second = renderSettled();

    assert.strictEqual(first, second);

    await Promise.all([first, second]);
  });

  test('resolves when rendering has completed (after property update)', async function (assert) {
    let state = new State();

    await render(<template>{{state.foo}}</template>);

    assert.dom().hasText('bar');
    state.foo = 'baz';
    assert.dom().hasText('bar');

    await renderSettled();

    assert.dom().hasText('baz');
  });

  test('resolves in run loop when renderer has settled', async function (assert) {
    assert.expect(3);

    let state = new State();

    await render(<template>{{state.foo}}</template>);

    assert.dom().hasText('bar');

    let settledInRunLoop;

    run(() => {
      schedule('actions', null, () => {
        state.foo = 'set in actions';

        settledInRunLoop = renderSettled();

        schedule('afterRender', null, () => {
          state.foo = 'set in afterRender';
        });
      });

      // still not updated here
      assert.dom().hasText('bar');
    });

    await settledInRunLoop;

    assert.dom().hasText('set in afterRender');
  });
});
