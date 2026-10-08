import { tracked } from '@glimmer/tracking';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';
import { concat } from '@ember/helper';

class Model {
  @tracked first;
  @tracked second;
  @tracked third;
  @tracked fourth;

  constructor({ first, second, third, fourth }) {
    this.first = first;
    this.second = second;
    this.third = third;
    this.fourth = fourth;
  }
}

class State {
  @tracked model;

  constructor(model) {
    this.model = new Model(model);
  }
}

module('Helpers test: {{concat}}', function (hooks) {
  setupRenderingTest(hooks);

  test('it concats static arguments', async function (assert) {
    await render(<template>{{concat "foo" " " "bar" " " "baz"}}</template>);

    await assert.stableRender('foo bar baz');
  });

  test('it updates for bound arguments', async function (assert) {
    let state = new State({ first: 'one', second: 'two' });

    await render(<template>{{concat state.model.first state.model.second}}</template>);

    await assert.stableRender('onetwo');

    state.model.first = 'three';
    await settled();

    assert.dom().hasText('threetwo');

    state.model.second = 'four';
    await settled();

    assert.dom().hasText('threefour');

    state.model = new Model({ first: 'one', second: 'two' });
    await settled();

    assert.dom().hasText('onetwo');
  });

  test('it can be used as a sub-expression', async function (assert) {
    let state = new State({ first: 'one', second: 'two', third: 'three', fourth: 'four' });

    await render(
      <template>{{concat (concat state.model.first state.model.second) (concat state.model.third state.model.fourth)}}</template>
    );

    await assert.stableRender('onetwothreefour');

    state.model.first = 'five';
    await settled();

    assert.dom().hasText('fivetwothreefour');

    state.model.second = 'six';
    state.model.third = 'seven';
    await settled();

    assert.dom().hasText('fivesixsevenfour');

    state.model = new Model({ first: 'one', second: 'two', third: 'three', fourth: 'four' });
    await settled();

    assert.dom().hasText('onetwothreefour');
  });

  test('it can be used as input for other helpers', async function (assert) {
    let state = new State({ first: 'one', second: 'two' });
    let eq = (actual, expected) => actual === expected;

    await render(
      <template>{{#if (eq (concat state.model.first state.model.second) "onetwo")}}Truthy!{{else}}False{{/if}}</template>
    );

    await assert.stableRender('Truthy!');

    state.model.first = 'three';
    await settled();

    assert.dom().hasText('False');

    state.model = new Model({ first: 'one', second: 'two' });
    await settled();

    assert.dom().hasText('Truthy!');
  });
});
