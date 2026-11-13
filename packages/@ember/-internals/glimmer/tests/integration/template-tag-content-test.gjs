import { tracked } from '@glimmer/tracking';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';
import { htmlSafe } from '@ember/template';
import { capabilities, setModifierManager } from '@ember/modifier';

// A `{{value}}` in a template renders what the value is, and renders what it
// is again after every change: text (escaped), the HTML of a SafeString, a DOM
// node, or the nodes of a DocumentFragment.

class State {
  @tracked value;

  constructor(value) {
    this.value = value;
  }
}

// The HTML of `element` without its comments: renderers mark empty content and
// the bounds of blocks with comments.
function htmlOf(element) {
  return element.innerHTML.replace(/<!--[\s\S]*?-->/g, '');
}

function em(text) {
  let element = document.createElement('em');
  element.textContent = text;
  return element;
}

function fragmentOf(...nodes) {
  let fragment = document.createDocumentFragment();
  for (let node of nodes) fragment.appendChild(node);
  return fragment;
}

// `state.value` starts as a string with markup. `read` returns the HTML around
// and of the content, `around` wraps the expected content in what surrounds it.
async function assertContentKinds(assert, state, read, around = (content) => content) {
  assert.strictEqual(read(), around('plain &lt;b&gt;text&lt;/b&gt;'), 'a string is escaped text');

  state.value = htmlSafe('<b>bold</b>');
  await settled();
  assert.strictEqual(read(), around('<b>bold</b>'), 'a SafeString renders its HTML');

  let node = em('node');
  state.value = node;
  await settled();
  assert.strictEqual(read(), around('<em>node</em>'), 'a DOM element renders as that element');
  assert.true(node.isConnected, 'the element itself is inserted');

  state.value = fragmentOf(em('one'), em('two'));
  await settled();
  assert.strictEqual(read(), around('<em>one</em><em>two</em>'), 'a fragment renders its nodes');
  assert.false(node.isConnected, 'the element left with its value');

  state.value = 'back to <i>text</i>';
  await settled();
  assert.strictEqual(read(), around('back to &lt;i&gt;text&lt;/i&gt;'), 'a string again');

  state.value = htmlSafe('<i>trusted</i>');
  await settled();
  assert.strictEqual(read(), around('<i>trusted</i>'), 'a SafeString again');

  state.value = 'text';
  await settled();
  assert.strictEqual(read(), around('text'), 'and a string after a SafeString');

  state.value = null;
  await settled();
  assert.strictEqual(read(), around(''), 'null renders nothing');
}

module('Integration | <template> | content mustache', function (hooks) {
  setupRenderingTest(hooks);

  test('the only content of an element renders what its value is', async function (assert) {
    let state = new State('plain <b>text</b>');

    await render(<template><div id='content'>{{state.value}}</div></template>);

    let content = this.element.querySelector('#content');
    await assertContentKinds(assert, state, () => htmlOf(content));
  });

  test('content between the text and the elements of an element renders what its value is', async function (assert) {
    let state = new State('plain <b>text</b>');

    await render(
      <template><div id='content'><b>[</b>before {{state.value}} after<b>]</b></div></template>
    );

    let content = this.element.querySelector('#content');
    await assertContentKinds(
      assert,
      state,
      () => htmlOf(content),
      (html) => `<b>[</b>before ${html} after<b>]</b>`
    );
  });

  test('content in an SVG element renders a SafeString as SVG', async function (assert) {
    let state = new State(htmlSafe('<tspan>one</tspan>'));

    await render(
      <template>
        <svg><text id='only'>{{state.value}}</text><text id='among'>[{{state.value}}]</text></svg>
      </template>
    );

    for (let id of ['only', 'among']) {
      let span = this.element.querySelector(`#${id} tspan`);
      assert.strictEqual(span?.namespaceURI, 'http://www.w3.org/2000/svg', `#${id}: an SVG tspan`);
    }

    state.value = 'two';
    await settled();
    assert.strictEqual(this.element.querySelector('#only').textContent, 'two');
    assert.strictEqual(this.element.querySelector('#among').textContent, '[two]');
  });

  test('a modifier of an element sees the content of the element when it is installed', async function (assert) {
    let seen = [];
    const peek = setModifierManager(
      () => ({
        capabilities: capabilities('3.22'),
        createModifier() {
          return {};
        },
        installModifier(state, element) {
          seen.push(htmlOf(element));
        },
        updateModifier() {},
        destroyModifier() {},
      }),
      class {}
    );
    let state = new State(htmlSafe('<b>bold</b>'));

    await render(<template><p {{peek}}>{{state.value}}</p><p {{peek}}>static</p></template>);

    assert.deepEqual(seen, ['<b>bold</b>', 'static']);
    assert.strictEqual(htmlOf(this.element.querySelector('p')), '<b>bold</b>');
  });

  test('a yielded block param in an element renders what its value is', async function (assert) {
    let state = new State('plain <b>text</b>');
    const Yield = <template>{{yield @value}}</template>;

    await render(
      <template>
        <Yield @value={{state.value}} as |value|><div id='content'>{{value}}</div></Yield>
      </template>
    );

    let content = this.element.querySelector('#content');
    await assertContentKinds(assert, state, () => htmlOf(content));
  });

  test('content at the top level of a template renders what its value is', async function (assert) {
    let state = new State('plain <b>text</b>');

    await render(<template>{{state.value}}</template>);

    await assertContentKinds(assert, state, () => htmlOf(this.element));
  });

  test('a yielded block param at the top level of the block renders what its value is', async function (assert) {
    let state = new State('plain <b>text</b>');
    const Yield = <template>{{yield @value}}</template>;

    await render(<template><Yield @value={{state.value}} as |value|>{{value}}</Yield></template>);

    await assertContentKinds(assert, state, () => htmlOf(this.element));
  });
});
