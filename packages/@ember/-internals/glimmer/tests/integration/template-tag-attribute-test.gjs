import { tracked } from '@glimmer/tracking';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';

// A bound attribute that names a property of its element (`name` of a
// `<button>`, `title`) is set through that property, so the attribute is the
// text the property reflects: `false` is "false". Any other bound attribute is
// an attribute: `false`, `null` and `undefined` remove it, and `true` is "".

class State {
  @tracked value;

  constructor(value) {
    this.value = value;
  }
}

module('Integration | <template> | bound attributes', function (hooks) {
  setupRenderingTest(hooks);

  test('an attribute that is a property of its element is set through the property', async function (assert) {
    let state = new State(false);

    await render(
      <template><button name={{state.value}} title={{state.value}}></button></template>
    );

    // (Not named `button`: a template's lexical scope would make <button> it.)
    let element = this.element.querySelector('button');
    let attributes = () => [element.getAttribute('name'), element.getAttribute('title')];
    assert.deepEqual(attributes(), ['false', 'false'], 'false is the text of the property');

    state.value = true;
    await settled();
    assert.deepEqual(attributes(), ['true', 'true'], 'true is the text of the property');

    state.value = 0;
    await settled();
    assert.deepEqual(attributes(), ['0', '0'], 'a number is its text');

    state.value = null;
    await settled();
    assert.deepEqual(attributes(), [null, null], 'null removes the attribute');

    state.value = 'text';
    await settled();
    assert.deepEqual(attributes(), ['text', 'text'], 'text is the attribute');

    state.value = undefined;
    await settled();
    assert.deepEqual(attributes(), [null, null], 'undefined removes the attribute');
  });

  test('an attribute that is no property of its element is an attribute', async function (assert) {
    let state = new State(true);

    await render(
      <template>
        <div data-flag={{state.value}} aria-pressed={{state.value}}></div>
        <span name={{state.value}}></span>
      </template>
    );

    let flagged = this.element.querySelector('div');
    let named = this.element.querySelector('span');
    let attributes = () => [
      flagged.getAttribute('data-flag'),
      flagged.getAttribute('aria-pressed'),
      named.getAttribute('name'),
    ];
    assert.deepEqual(attributes(), ['', '', ''], 'true is an empty attribute');

    state.value = false;
    await settled();
    assert.deepEqual(attributes(), [null, null, null], 'false removes the attribute');

    state.value = 'yes';
    await settled();
    assert.deepEqual(attributes(), ['yes', 'yes', 'yes'], 'text is the attribute');
  });
});
