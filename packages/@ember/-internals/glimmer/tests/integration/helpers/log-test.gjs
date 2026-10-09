import Component from '@glimmer/component';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';

module('Helpers test: {{log}}', function (hooks) {
  setupRenderingTest(hooks);

  let originalLog;
  let logCalls;

  hooks.beforeEach(function () {
    /* eslint-disable no-console */
    originalLog = console.log;
    logCalls = [];
    console.log = (...args) => {
      logCalls.push(...args);
      /* eslint-enable no-console */
    };
  });

  hooks.afterEach(function () {
    /* eslint-disable no-console */
    console.log = originalLog;
    /* eslint-enable no-console */
  });

  function assertLog(assert, values) {
    assert.dom().hasNoText();
    assert.strictEqual(logCalls.length, values.length);

    for (let i = 0, len = values.length; i < len; i++) {
      assert.strictEqual(logCalls[i], values[i]);
    }
  }

  test('correctly logs primitives', async function (assert) {
    await render(<template>{{log "one" 1 true}}</template>);

    assertLog(assert, ['one', 1, true]);
  });

  test('correctly logs a property', async function (assert) {
    class Subject extends Component {
      value = 'one';

      <template>{{log this.value}}</template>
    }

    await render(<template><Subject /></template>);

    assertLog(assert, ['one']);
  });

  test('correctly logs multiple arguments', async function (assert) {
    class Subject extends Component {
      value = 'one';

      <template>{{log "my variable:" this.value}}</template>
    }

    await render(<template><Subject /></template>);

    assertLog(assert, ['my variable:', 'one']);
  });

  test('correctly logs `this`', async function (assert) {
    let instance;

    class Subject extends Component {
      constructor() {
        super(...arguments);
        instance = this;
      }

      <template>{{log this}}</template>
    }

    await render(<template><Subject /></template>);

    assertLog(assert, [instance]);
  });
});
