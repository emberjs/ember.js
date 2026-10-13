import { tracked } from '@glimmer/tracking';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';

class Model {
  @tracked viewBoxString;
  @tracked color;

  constructor({ viewBoxString, color }) {
    this.viewBoxString = viewBoxString;
    this.color = color;
  }
}

class State {
  @tracked model;

  constructor(model) {
    this.model = new Model(model);
  }
}

module('SVG element tests', function (hooks) {
  setupRenderingTest(hooks);

  test('unquoted viewBox property is output', async function (assert) {
    let viewBoxString = '0 0 100 100';
    let state = new State({ viewBoxString });

    await render(
      <template>
        <div><svg viewBox={{state.model.viewBoxString}}></svg></div>
      </template>
    );

    await assert.stableRender('<div><svg viewBox="0 0 100 100"></svg></div>');

    state.model.viewBoxString = null;
    await settled();

    assert.dom('div').doesNotHaveAttribute('svg');

    state.model = new Model({ viewBoxString });
    await settled();

    assert.dom('svg').hasAttribute('viewBox', '0 0 100 100');
  });

  test('quoted viewBox property is output', async function (assert) {
    let viewBoxString = '0 0 100 100';
    let state = new State({ viewBoxString });

    await render(
      <template>
        <div><svg viewBox='{{state.model.viewBoxString}}'></svg></div>
      </template>
    );

    await assert.stableRender('<div><svg viewBox="0 0 100 100"></svg></div>');

    state.model.viewBoxString = null;
    await settled();

    assert.dom('div').doesNotHaveAttribute('svg');

    state.model = new Model({ viewBoxString });
    await settled();

    assert.dom('svg').hasAttribute('viewBox', '0 0 100 100');
  });

  test('quoted viewBox property is concat', async function (assert) {
    let viewBoxString = '100 100';
    let state = new State({ viewBoxString });

    await render(
      <template>
        <div><svg viewBox='0 0 {{state.model.viewBoxString}}'></svg></div>
      </template>
    );

    await assert.stableRender('<div><svg viewBox="0 0 100 100"></svg></div>');

    state.model.viewBoxString = '200 200';
    await settled();

    assert.dom('svg').hasAttribute('viewBox', '0 0 200 200');

    state.model = new Model({ viewBoxString });
    await settled();

    assert.dom('svg').hasAttribute('viewBox', '0 0 100 100');
  });

  test('class is output', async function (assert) {
    let state = new State({ color: 'blue' });

    await render(
      <template>
        <div><svg class='{{state.model.color}} tall'></svg></div>
      </template>
    );

    await assert.stableRender('<div><svg class="blue tall"></svg></div>');

    state.model.color = 'yellow';
    await settled();

    assert.dom('svg').hasAttribute('class', 'yellow tall');

    state.model = new Model({ color: 'blue' });
    await settled();

    assert.dom('svg').hasAttribute('class', 'blue tall');
  });
});
