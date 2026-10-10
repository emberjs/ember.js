import { tracked } from '@glimmer/tracking';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';

class State {
  @tracked name = 'Robert';
}

module('Components test: web component fallback', function (hooks) {
  setupRenderingTest(hooks);

  test('custom elements are rendered', async function (assert) {
    await render(
      <template>
        <foo-bar some-attr='123'>hello</foo-bar>
      </template>
    );

    await assert.stableRender('<foo-bar some-attr="123">hello</foo-bar>');
  });

  test('custom elements can have bound attributes', async function (assert) {
    let state = new State();

    await render(
      <template>
        <foo-bar some-attr='{{state.name}}'>hello</foo-bar>
      </template>
    );

    await assert.stableRender('<foo-bar some-attr="Robert">hello</foo-bar>');

    state.name = 'Kris';
    await settled();

    assert.dom('foo-bar').hasAttribute('some-attr', 'Kris').hasText('hello');

    state.name = 'Robert';
    await settled();

    assert.dom('foo-bar').hasAttribute('some-attr', 'Robert').hasText('hello');
  });
});
