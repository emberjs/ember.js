import { DEBUG } from '@glimmer/env';
import { tracked } from '@glimmer/tracking';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';
import { element, hash } from '@ember/helper';
import { on } from '@ember/modifier';

module('Helpers test: {{element}}', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders a tag with the given tag name', async function (assert) {
    await render(
      <template>
        {{#let (element 'h1') as |Tag|}}
          <Tag id='content'>hello world!</Tag>
        {{/let}}
      </template>
    );

    assert.dom().hasHtml('<h1 id="content">hello world!</h1>');
  });

  test('it does not render any tags when passed an empty string', async function (assert) {
    await render(
      <template>
        {{#let (element '') as |Tag|}}
          <Tag id='content'>hello world!</Tag>
        {{/let}}
      </template>
    );

    assert.dom().hasHtml('hello world!');
  });

  test('it throws when passed null', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    let nil = null;

    await assert.rejects(
      render(
        <template>
          {{#let (element nil) as |Tag|}}<Tag>hello</Tag>{{/let}}
        </template>
      ),
      /The argument passed to the `element` helper must be a string/
    );
  });

  test('it throws when passed undefined', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    let undef = undefined;

    await assert.rejects(
      render(
        <template>
          {{#let (element undef) as |Tag|}}<Tag>hello</Tag>{{/let}}
        </template>
      ),
      /The argument passed to the `element` helper must be a string/
    );
  });

  test('it works with element modifiers', async function (assert) {
    let didClick = () => {};

    await render(
      <template>
        {{#let (element 'button') as |Tag|}}
          <Tag type='button' id='action' {{on 'click' didClick}}>hello world!</Tag>
        {{/let}}
      </template>
    );

    assert.dom().hasHtml('<button id="action" type="button">hello world!</button>');
  });

  test('it can be rendered multiple times', async function (assert) {
    await render(
      <template>
        {{#let (element 'h1') as |Tag|}}
          <Tag id='content-1'>hello</Tag>
          <Tag id='content-2'>world</Tag>
          <Tag id='content-3'>!!!!!</Tag>
        {{/let}}
      </template>
    );

    assert
      .dom()
      .hasHtml(
        '<h1 id="content-1">hello</h1> <h1 id="content-2">world</h1> <h1 id="content-3">!!!!!</h1>'
      );
  });

  test('it renders when the tag name changes', async function (assert) {
    class State {
      @tracked htmlTag = 'h1';
    }

    let state = new State();

    await render(
      <template>
        {{#let (element state.htmlTag) as |Tag|}}
          <Tag id='content'>hello</Tag>
        {{/let}}
      </template>
    );

    assert.dom().hasHtml('<h1 id="content">hello</h1>');

    state.htmlTag = 'h2';
    await settled();
    assert.dom().hasHtml('<h2 id="content">hello</h2>');

    state.htmlTag = 'h3';
    await settled();
    assert.dom().hasHtml('<h3 id="content">hello</h3>');

    state.htmlTag = '';
    await settled();
    assert.dom().hasText('hello');

    state.htmlTag = 'h1';
    await settled();
    assert.dom().hasHtml('<h1 id="content">hello</h1>');
  });

  test('it can be passed as argument and works with ...attributes', async function (assert) {
    let Inner = <template>
      {{#let @tag as |Tag|}}
        <Tag id='content' ...attributes>{{yield}}</Tag>
      {{/let}}
    </template>;

    await render(
      <template>
        <Inner @tag={{element 'p'}} class='extra'>Test</Inner>
      </template>
    );

    assert.dom().hasHtml('<p id="content" class="extra">Test</p>');
  });

  test('it requires at least one argument', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    await assert.rejects(
      render(
        <template>
          {{#let (element) as |Tag|}}<Tag>hello</Tag>{{/let}}
        </template>
      ),
      /The `element` helper takes a single positional argument/
    );
  });

  test('it requires no more than one argument', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    await assert.rejects(
      render(
        <template>
          {{#let (element 'h1' 'h2') as |Tag|}}<Tag>hello</Tag>{{/let}}
        </template>
      ),
      /The `element` helper takes a single positional argument/
    );
  });

  test('it does not take any named arguments', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    await assert.rejects(
      render(
        <template>
          {{#let (element 'h1' id='content') as |Tag|}}<Tag>hello</Tag>{{/let}}
        </template>
      ),
      /The `element` helper does not take any named arguments/
    );
  });

  test('it throws when passed a number', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    let num = 123;

    await assert.rejects(
      render(
        <template>
          {{#let (element num) as |Tag|}}<Tag>hello</Tag>{{/let}}
        </template>
      ),
      /The argument passed to the `element` helper must be a string \(you passed `123`\)/
    );
  });

  test('it throws when passed a boolean', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    let bool = false;

    await assert.rejects(
      render(
        <template>
          {{#let (element bool) as |Tag|}}<Tag>hello</Tag>{{/let}}
        </template>
      ),
      /The argument passed to the `element` helper must be a string \(you passed `false`\)/
    );
  });

  test('it throws when passed an object', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    await assert.rejects(
      render(
        <template>
          {{#let (element (hash)) as |Tag|}}<Tag>hello</Tag>{{/let}}
        </template>
      ),
      /The argument passed to the `element` helper must be a string/
    );
  });
});
