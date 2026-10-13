import { tracked } from '@glimmer/tracking';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';

module('Helpers test: inline {{if}} subexpression laziness', function (hooks) {
  setupRenderingTest(hooks);

  test('it does not evaluate a subexpression with only const arguments when the branch is not taken (GH#21030)', async function (assert) {
    let called = 0;

    function sideEffect() {
      called++;
      return 'value';
    }

    class State {
      @tracked text = '';
    }

    let state = new State();

    await render(<template>{{if false (sideEffect)}}{{state.text}}</template>);

    assert.strictEqual(called, 0, 'helper was not evaluated for the untaken branch');
    await assert.stableRender('');

    state.text = 'updated';
    await settled();

    assert.dom().hasText('updated');
    assert.strictEqual(called, 0, 'helper was not evaluated on rerender');
  });
});
