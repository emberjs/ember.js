import { tracked } from '@glimmer/tracking';
import { getValue } from '@glimmer/validator';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { find, findAll, render, settled } from '@ember/test-helpers';
import { uniqueId, invokeHelper } from '@ember/helper';

class State {
  @tracked prefix = 'app';
}

module('Helpers test: {{unique-id}} JS', function () {
  test('it can be invoked as a JS function', function (assert) {
    let first = uniqueId();
    let second = uniqueId();

    assert.notStrictEqual(
      first,
      second,
      `different invocations of uniqueId should produce different values`
    );
  });

  test('it can be invoked via invokeHelper', function (assert) {
    let first = getValue(invokeHelper({}, uniqueId));
    let second = getValue(invokeHelper({}, uniqueId));

    assert.notStrictEqual(
      first,
      second,
      `different invocations of uniqueId should produce different values`
    );
  });
});

module('Helpers test: {{unique-id}}', function (hooks) {
  setupRenderingTest(hooks);

  test('it generates a unique id (string) each time', async function (assert) {
    await render(
      <template>
        <p>{{(uniqueId)}}</p><p>{{(uniqueId)}}</p>
      </template>
    );

    assert.dom('p').exists({ count: 2 });
    assert.dom('p:first-of-type').hasAnyText();
    assert.dom('p:last-of-type').hasAnyText();

    let first = find('p:first-of-type').textContent;
    let second = find('p:last-of-type').textContent;

    await assert.stableRender();

    assert.notStrictEqual(
      first,
      second,
      `different invocations of {{unique-id}} should produce different values`
    );
  });

  test(`when unique-id is used with #let, it remains stable when it's used`, async function (assert) {
    await render(
      <template>
        {{#let (uniqueId) as |id|}}<p>{{id}}</p><p>{{id}}</p>{{/let}}
      </template>
    );

    assert.dom('p').exists({ count: 2 });
    assert.dom('p:first-of-type').hasAnyText();
    assert.dom('p:last-of-type').hasAnyText();

    let first = find('p:first-of-type').textContent;
    let second = find('p:last-of-type').textContent;

    await assert.stableRender();

    assert.strictEqual(first, second, `when unique-id is used as a variable, it remains the same`);
  });

  test(`unique-id doesn't change if it's concatenated with a value that does change`, async function (assert) {
    function uniquePart(prefix) {
      let forAttr = find('label').getAttribute('for');

      assert
        .dom('input')
        .hasAttribute(
          'id',
          forAttr,
          `the label's 'for' attribute should be the same as the input's 'id' attribute`
        );
      assert
        .dom('label')
        .hasAttribute('for', new RegExp(`^${prefix}-.+$`), 'the id starts with the prefix');

      return forAttr.slice(prefix.length + 1);
    }

    let state = new State();

    await render(
      <template>
        {{#let (uniqueId) as |id|}}
          <label for='{{state.prefix}}-{{id}}'>Enable Feature</label>
          <input id='{{state.prefix}}-{{id}}' type='checkbox' />
        {{/let}}
      </template>
    );

    let id = uniquePart('app');

    await assert.stableRender();

    state.prefix = 'melanie';
    await settled();

    let newId = uniquePart('melanie');

    assert.strictEqual(
      id,
      newId,
      `the unique-id part of a concatenated attribute shouldn't change just because a dynamic part of it changed`
    );

    await assert.stableRender();
  });

  test('it only generates valid selectors', async function (assert) {
    let iterations = 1000;
    let items = new Array(iterations).fill(null);

    await render(
      <template>
        {{#each items}}<p>{{(uniqueId)}}</p>{{/each}}
      </template>
    );

    assert.dom('p').exists({ count: iterations });

    for (let paragraph of findAll('p')) {
      assert.dom(paragraph).hasText(/^\D/, '{{unique-id}} should produce valid selectors');
    }
  });
});
