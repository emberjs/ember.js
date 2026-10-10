import Component from '@glimmer/component';
import { DEBUG } from '@glimmer/env';
import { tracked } from '@glimmer/tracking';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';
import { fn } from '@ember/helper';

class State {
  @tracked myFunc;
  @tracked arg1;
  @tracked arg2;
  @tracked arg3;

  constructor({ myFunc, arg1, arg2, arg3 }) {
    this.myFunc = myFunc;
    this.arg1 = arg1;
    this.arg2 = arg2;
    this.arg3 = arg3;
  }
}

let stashedFn;

class Stash extends Component {
  constructor(owner, args) {
    super(owner, args);
    stashedFn = this.args.stashedFn;
  }

  <template></template>
}

function invoke(fn) {
  return fn();
}

function boundFn(fn, ...args) {
  return () => fn(...args.map((arg) => `bound:${arg}`));
}

let id = (arg) => arg;

module('Helpers test: {{fn}}', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    stashedFn = undefined;
  });

  test('fn can be shadowed', async function (assert) {
    let fn = boundFn;

    await render(
      <template>
        [{{invoke (fn id 1)}}]{{#let boundFn as |fn|}}[{{invoke (fn id 2)}}{{/let}}]
      </template>
    );

    await assert.stableRender('[bound:1][bound:2]');
  });

  test('updates when arguments change', async function (assert) {
    let state = new State({
      myFunc(arg1, arg2) {
        return `arg1: ${arg1}, arg2: ${arg2}`;
      },

      arg1: 'foo',
      arg2: 'bar',
    });

    await render(<template>{{invoke (fn state.myFunc state.arg1 state.arg2)}}</template>);

    await assert.stableRender('arg1: foo, arg2: bar');

    state.arg1 = 'qux';
    await settled();

    assert.dom().hasText('arg1: qux, arg2: bar');

    state.arg2 = 'derp';
    await settled();

    assert.dom().hasText('arg1: qux, arg2: derp');

    state.arg1 = 'foo';
    state.arg2 = 'bar';
    await settled();

    assert.dom().hasText('arg1: foo, arg2: bar');
  });

  test('updates when the function changes', async function (assert) {
    let func1 = (arg1, arg2) => `arg1: ${arg1}, arg2: ${arg2}`;
    let func2 = (arg1, arg2) => `arg2: ${arg2}, arg1: ${arg1}`;
    let state = new State({ myFunc: func1, arg1: 'foo', arg2: 'bar' });

    await render(<template>{{invoke (fn state.myFunc state.arg1 state.arg2)}}</template>);

    await assert.stableRender('arg1: foo, arg2: bar');

    state.myFunc = func2;
    await settled();

    assert.dom().hasText('arg2: bar, arg1: foo');

    state.myFunc = func1;
    await settled();

    assert.dom().hasText('arg1: foo, arg2: bar');
  });

  test('a stashed fn result update arguments when invoked', async function (assert) {
    let state = new State({
      myFunc(arg1, arg2) {
        return `arg1: ${arg1}, arg2: ${arg2}`;
      },

      arg1: 'foo',
      arg2: 'bar',
    });

    await render(
      <template><Stash @stashedFn={{fn state.myFunc state.arg1 state.arg2}} /></template>
    );

    assert.strictEqual(stashedFn(), 'arg1: foo, arg2: bar');

    state.arg1 = 'qux';
    await settled();

    assert.strictEqual(stashedFn(), 'arg1: qux, arg2: bar');

    state.arg2 = 'derp';
    await settled();

    assert.strictEqual(stashedFn(), 'arg1: qux, arg2: derp');

    state.arg1 = 'foo';
    state.arg2 = 'bar';
    await settled();

    assert.strictEqual(stashedFn(), 'arg1: foo, arg2: bar');
  });

  test('a stashed fn result invokes the correct function when the bound function changes', async function (assert) {
    let func1 = (arg1, arg2) => `arg1: ${arg1}, arg2: ${arg2}`;
    let func2 = (arg1, arg2) => `arg2: ${arg2}, arg1: ${arg1}`;
    let state = new State({ myFunc: func1, arg1: 'foo', arg2: 'bar' });

    await render(
      <template><Stash @stashedFn={{fn state.myFunc state.arg1 state.arg2}} /></template>
    );

    assert.strictEqual(stashedFn(), 'arg1: foo, arg2: bar');

    state.myFunc = func2;
    await settled();

    assert.strictEqual(stashedFn(), 'arg2: bar, arg1: foo');

    state.myFunc = func1;
    await settled();

    assert.strictEqual(stashedFn(), 'arg1: foo, arg2: bar');
  });

  test('there is no `this` context within the callback', async function (assert) {
    if (DEBUG) {
      assert.expect(0);
      return;
    }

    let state = new State({
      myFunc() {
        assert.strictEqual(this, null, 'this is bound to null in production builds');
      },
    });

    await render(<template><Stash @stashedFn={{fn state.myFunc state.arg1}} /></template>);

    stashedFn();
  });

  test('can use `this` if bound prior to passing to fn', async function (assert) {
    let context = {
      myFunc(arg1) {
        return `arg1: ${arg1}, arg2: ${this.arg2}`;
      },
      get myFunc2() {
        return this.myFunc.bind(this);
      },

      arg1: 'foo',
      arg2: 'bar',
    };

    await render(<template><Stash @stashedFn={{fn context.myFunc2 context.arg1}} /></template>);

    assert.strictEqual(stashedFn(), 'arg1: foo, arg2: bar');
  });

  test('partially applies each layer when nested [GH#17959]', async function (assert) {
    let state = new State({
      myFunc(arg1, arg2, arg3) {
        return `arg1: ${arg1}, arg2: ${arg2}, arg3: ${arg3}`;
      },

      arg1: 'foo',
      arg2: 'bar',
      arg3: 'qux',
    });

    await render(
      <template>{{invoke (fn (fn (fn state.myFunc state.arg1) state.arg2) state.arg3)}}</template>
    );

    await assert.stableRender('arg1: foo, arg2: bar, arg3: qux');

    state.arg1 = 'qux';
    await settled();

    assert.dom().hasText('arg1: qux, arg2: bar, arg3: qux');

    state.arg2 = 'derp';
    await settled();

    assert.dom().hasText('arg1: qux, arg2: derp, arg3: qux');

    state.arg3 = 'huzzah';
    await settled();

    assert.dom().hasText('arg1: qux, arg2: derp, arg3: huzzah');

    state.arg1 = 'foo';
    state.arg2 = 'bar';
    state.arg3 = 'qux';
    await settled();

    assert.dom().hasText('arg1: foo, arg2: bar, arg3: qux');
  });

  test('can be used on the result of `mut`', async function (assert) {
    let state = new State({ arg1: 'foo', arg2: 'bar' });

    await render(
      <template>{{state.arg1}}<Stash @stashedFn={{fn (mut state.arg1) state.arg2}} /></template>
    );

    assert.dom().hasText('foo');

    stashedFn();
    await settled();

    assert.dom().hasText('bar');
  });

  test('can be used on the result of `mut` with a falsy value', async function (assert) {
    let state = new State({ arg1: 'foo', arg2: false });

    await render(
      <template>{{state.arg1}}<Stash @stashedFn={{fn (mut state.arg1) state.arg2}} /></template>
    );

    assert.dom().hasText('foo');

    stashedFn();
    await settled();

    assert.dom().hasText('false');
  });
});
