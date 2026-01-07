/* eslint-disable disable-features/disable-async-await */
import { module, test } from 'qunit';
import { hbs } from 'ember-cli-htmlbars';
import { setupRenderingTest } from 'ember-qunit';
import { click, render, settled } from '@ember/test-helpers';
import { helper } from '@ember/component/helper';
import Ember from 'ember';
import { macroCondition, dependencySatisfies } from '@embroider/macros';

module('Integration | Helper | element', function (hooks) {
  let originalOnerror;
  let expectEmberError;
  let expectedEmberErrors;

  setupRenderingTest(hooks);

  hooks.beforeEach((assert) => {
    originalOnerror = Ember.onerror;

    expectEmberError = function (expectation) {
      let _onerror = Ember.onerror;

      expectedEmberErrors.push(expectation);

      Ember.onerror = function (error) {
        assert.throws(() => {
          throw error;
        }, expectedEmberErrors.pop());
        Ember.onerror = _onerror;
      };
    };

    expectedEmberErrors = [];
  });

  hooks.afterEach((assert) => {
    Ember.onerror = originalOnerror;

    expectedEmberErrors.forEach((expected) => {
      assert.strictEqual(undefined, expected);
    });
  });

  test('it renders a tag with the given tag name', async function (assert) {
    await render(hbs`
      {{#let (element "h1") as |Tag|}}
        <Tag id="content">hello world!</Tag>
      {{/let}}
    `);

    assert.dom('h1#content').hasText('hello world!');
  });

  test('it does not render any tags when passed an empty string', async function (assert) {
    await render(hbs`
      {{#let (element "") as |Tag|}}
        <Tag id="content">hello world!</Tag>
      {{/let}}
    `);

    assert.strictEqual(this.element.innerHTML.trim(), 'hello world!');
  });

  test('it does not render anything when passed null', async function (assert) {
    await render(hbs`
      {{#let (element null) as |Tag|}}
        <Tag id="content">hello world!</Tag>
      {{/let}}
    `);

    assert.strictEqual(this.element.innerHTML.trim(), '<!---->');
  });

  test('it does not render anything when passed undefined', async function (assert) {
    await render(hbs`
      {{#let (element undefined) as |Tag|}}
        <Tag id="content">hello world!</Tag>
      {{/let}}
    `);

    assert.strictEqual(this.element.innerHTML.trim(), '<!---->');
  });

  test('it works with element modifiers', async function (assert) {
    let clicked = 0;

    this.set('didClick', () => clicked++);

    // https://github.com/ember-cli/babel-plugin-htmlbars-inline-precompile/issues/103
    await render(
      hbs(
        '\
        {{#let (element "button") as |Tag|}}\
          <Tag type="button" id="action" {{on "click" this.didClick}}>hello world!</Tag>\
        {{/let}}\
      ',
        { insertRuntimeErrors: true }
      )
    );

    assert.dom('button#action').hasAttribute('type', 'button').hasText('hello world!');
    assert.strictEqual(clicked, 0, 'never clicked');

    await click('button#action');

    assert.strictEqual(clicked, 1, 'clicked once');

    await click('button#action');

    assert.strictEqual(clicked, 2, 'clicked twice');
  });

  test('it can be rendered multiple times', async function (assert) {
    await render(hbs`
      {{#let (element "h1") as |Tag|}}
        <Tag id="content-1">hello</Tag>
        <Tag id="content-2">world</Tag>
        <Tag id="content-3">!!!!!</Tag>
      {{/let}}
    `);

    assert.dom('h1#content-1').hasText('hello');
    assert.dom('h1#content-2').hasText('world');
    assert.dom('h1#content-3').hasText('!!!!!');
  });

  test('it can be passed to the component helper', async function (assert) {
    await render(hbs`
      {{#let (component (ensure-safe-component (element "h1"))) as |Tag|}}
        <Tag id="content-1">hello</Tag>
      {{/let}}

      {{#let (element "h2") as |h2|}}
        {{#let (ensure-safe-component h2) as |Tag|}}
          <Tag id="content-2">world</Tag>
        {{/let}}
      {{/let}}

      {{#let (element "h3") as |h3|}}
        {{#component (ensure-safe-component h3) id="content-3"}}!!!!!{{/component}}
      {{/let}}
    `);

    assert.dom('h1#content-1').hasText('hello');
    assert.dom('h2#content-2').hasText('world');
    assert.dom('h3#content-3').hasText('!!!!!');
  });

  test('it renders when the tag name changes', async function (assert) {
    let count = 0;

    this.owner.register(
      'helper:counter',
      helper(() => ++count)
    );

    this.set('tagName', 'h1');

    await render(hbs`
      {{#let (element this.tagName) as |Tag|}}
        <Tag id="content">rendered {{counter}} time(s)</Tag>
      {{/let}}
    `);

    assert.dom('h1#content').hasText('rendered 1 time(s)');
    assert.dom('h2#content').doesNotExist();
    assert.dom('h3#content').doesNotExist();

    this.set('tagName', 'h2');

    await settled();

    assert.dom('h1#content').doesNotExist();
    assert.dom('h2#content').hasText('rendered 2 time(s)');
    assert.dom('h3#content').doesNotExist();

    this.set('tagName', 'h2');

    await settled();

    assert.dom('h1#content').doesNotExist();
    assert.dom('h2#content').hasText('rendered 2 time(s)');
    assert.dom('h3#content').doesNotExist();

    this.set('tagName', 'h3');

    await settled();

    assert.dom('h1#content').doesNotExist();
    assert.dom('h2#content').doesNotExist();
    assert.dom('h3#content').hasText('rendered 3 time(s)');

    this.set('tagName', '');

    await settled();

    assert.dom('h1#content').doesNotExist();
    assert.dom('h2#content').doesNotExist();
    assert.dom('h3#content').doesNotExist();

    assert.strictEqual(this.element.innerHTML.trim(), 'rendered 4 time(s)');

    this.set('tagName', 'h1');

    await settled();

    assert.dom('h1#content').hasText('rendered 5 time(s)');
    assert.dom('h2#content').doesNotExist();
    assert.dom('h3#content').doesNotExist();
  });

  test('it can be passed as argument and works with ...attributes', async function (assert) {
    this.set('tagName', 'p');

    await render(hbs`
      <ElementReceiver @tag={{element this.tagName}} class="extra">Test</ElementReceiver>
    `);

    assert.dom('p#content').hasText('Test').hasClass('extra');

    this.set('tagName', 'div');

    await settled();

    assert.dom('div#content').hasText('Test').hasClass('extra');

    this.set('tagName', '');

    await settled();

    assert.strictEqual(this.element.innerText.trim(), 'Test');

    this.set('tagName', 'p');

    await settled();

    assert.dom('p#content').hasText('Test').hasClass('extra');
  });

  test.skip('it can be invoked inline', async function (assert) {
    this.set('tagName', 'p');

    await render(hbs`{{element this.tagName}}`);

    assert.dom('p').exists();

    this.set('tagName', 'br');

    await settled();

    assert.dom('br').exists();

    this.set('tagName', '');

    assert.strictEqual(this.element.innerHTML.trim(), '<!---->');

    this.set('tagName', 'p');

    await settled();

    assert.dom('p').exists();
  });

  module('invalid usages', function () {
    test('it requires at least one argument', async function () {
      expectEmberError(
        new Error('Assertion Failed: The `element` helper takes a single positional argument')
      );

      await render(hbs`
        <div>
          {{#let (element) as |Tag|}}
            <Tag id="content">hello world!</Tag>
          {{/let}}
        </div>
      `);
    });

    test('it requires no more than one argument', async function () {
      expectEmberError(
        new Error('Assertion Failed: The `element` helper takes a single positional argument')
      );

      await render(hbs`
        <div>
          {{#let (element "h1" "h2") as |Tag|}}
            <Tag id="content">hello world!</Tag>
          {{/let}}
        </div>
      `);
    });

    test('it does not take any named arguments', async function () {
      expectEmberError(
        new Error('Assertion Failed: The `element` helper does not take any named arguments')
      );

      await render(hbs`
        <div>
          {{#let (element "h1" id="content") as |Tag|}}
            <Tag id="content">hello world!</Tag>
          {{/let}}
        </div>
      `);
    });

    test('it does not take a block', async function (assert) {
      // Before the EMBER_GLIMMER_ANGLE_BRACKET_BUILT_INS feature was enabled
      // in 3.10, the "dash rule" short-circuited this assertion by accident,
      // so this was just a no-op but no error was thrown.
      if (macroCondition(dependencySatisfies('ember-source', '>=3.25.0-beta.0'))) {
        expectEmberError(
          new Error(
            'Attempted to resolve `element`, which was expected to be a component, but nothing was found.'
          )
        );
      } else if (macroCondition(dependencySatisfies('ember-source', '>=3.10.0-beta.0'))) {
        expectEmberError(
          new Error(
            'Assertion Failed: Helpers may not be used in the block form, for example {{#element}}{{/element}}. Please use a component, or alternatively use the helper in combination with a built-in Ember helper, for example {{#if (element)}}{{/if}}.'
          )
        );
      }

      // Due to https://github.com/glimmerjs/glimmer-vm/pull/1073, we need to
      // wrap the invalid block in a conditional to ensure the initial render
      // complete without errors. This is fixed in Ember 3.16+.
      this.set('showBlock', false);

      await render(hbs`
        <div>
          {{#if this.showBlock}}
            {{#element "h1"}}hello world!{{/element}}
          {{/if}}
        </div>
      `);

      assert.dom('h1').doesNotExist();

      this.set('showBlock', true);

      await settled();

      assert.dom('h1').doesNotExist();
    });

    test('it throws when passed a number', async function () {
      expectEmberError(
        new Error(
          'Assertion Failed: The argument passed to the `element` helper must be a string (you passed `123`)'
        )
      );

      await render(hbs`
        <div>
          {{#let (element 123) as |Tag|}}
            <Tag id="content">hello world!</Tag>
          {{/let}}
        </div>
      `);
    });

    test('it throws when passed a boolean', async function () {
      expectEmberError(
        new Error(
          'Assertion Failed: The argument passed to the `element` helper must be a string (you passed `false`)'
        )
      );

      await render(hbs`
        <div>
          {{#let (element false) as |Tag|}}
            <Tag id="content">hello world!</Tag>
          {{/let}}
        </div>
      `);
    });

    test('it throws when passed an object', async function () {
      expectEmberError(
        new Error('Assertion Failed: The argument passed to the `element` helper must be a string')
      );

      await render(hbs`
        <div>
          {{#let (element (hash)) as |Tag|}}
            <Tag id="content">hello world!</Tag>
          {{/let}}
        </div>
      `);
    });
  });
});
