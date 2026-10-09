import { tracked } from '@glimmer/tracking';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';

class State {
  @tracked var = 'var';
}

module('syntax refinements', function (hooks) {
  setupRenderingTest(hooks);

  test('block params should not be refined', async function (assert) {
    let state = new State();
    let foo = () => 'bar helper';

    await render(
      <template>
        {{#let state.var as |foo|}}
          {{foo}}
        {{/let}}

        ---

        {{#let state.var as |outlet|}}
          {{outlet}}
        {{/let}}

        ---

        {{#let state.var as |mount|}}
          {{mount}}
        {{/let}}

        ---

        {{#let state.var as |component|}}
          {{component}}
        {{/let}}

        ---

        {{#let state.var as |input|}}
          {{input}}
        {{/let}}

        ---

        {{#let state.var as |-with-dynamic-vars|}}
          {{-with-dynamic-vars}}
        {{/let}}

        ---

        {{#let state.var as |-in-element|}}
          {{-in-element}}
        {{/let}}
      </template>
    );

    assert.dom().hasText('var --- var --- var --- var --- var --- var --- var');
    await assert.stableRender();

    state.var = 'RARRR!!!';
    await settled();

    assert
      .dom()
      .hasText(
        'RARRR!!! --- RARRR!!! --- RARRR!!! --- RARRR!!! --- RARRR!!! --- RARRR!!! --- RARRR!!!'
      );

    state.var = 'var';
    await settled();

    assert.dom().hasText('var --- var --- var --- var --- var --- var --- var');
  });
});
