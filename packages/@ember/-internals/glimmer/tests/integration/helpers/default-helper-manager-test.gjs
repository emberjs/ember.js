import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';
import { action } from '@ember/object';

class State {
  @tracked foo = 123;
}

module('Helpers test: default helper manager', function (hooks) {
  setupRenderingTest(hooks);

  test('plain functions can be used as helpers', async function (assert) {
    function hello() {
      return 'hello';
    }

    await render(<template>{{(hello)}}</template>);

    await assert.stableRender('hello');
  });

  test('positional arguments are passed as function arguments', async function (assert) {
    function hello(...args) {
      assert.deepEqual(args, [1, 2, 3]);
      return args.length;
    }

    await render(<template>{{(hello 1 2 3)}}</template>);

    assert.dom().hasText('3');
  });

  test('tracks changes to positional arguments', async function (assert) {
    let state = new State();
    let count = 0;

    function hello(firstArgument) {
      count++;
      return firstArgument;
    }

    await render(<template>{{(hello state.foo)}}</template>);

    assert.strictEqual(count, 1, 'rendered once');
    await assert.stableRender('123');
    assert.strictEqual(count, 1, 'rendered once');

    state.foo = 456;
    await settled();

    assert.strictEqual(count, 2, 'rendered twice');
    assert.dom().hasText('456');
  });

  test('named arguments are passed as the last function argument', async function (assert) {
    function hello(positional, named) {
      assert.strictEqual(positional, 'foo');

      return named.foo;
    }

    await render(<template>{{(hello 'foo' foo='bar')}}</template>);

    assert.dom().hasText('bar');
  });

  test('tracks changes to named arguments', async function (assert) {
    let state = new State();
    let count = 0;

    function hello(named) {
      count++;
      return named.foo;
    }

    await render(<template>{{(hello foo=state.foo)}}</template>);

    assert.strictEqual(count, 1, 'rendered once');
    await assert.stableRender('123');
    assert.strictEqual(count, 1, 'rendered once');

    state.foo = 456;
    await settled();

    assert.strictEqual(count, 2, 'rendered twice');
    assert.dom().hasText('456');
  });

  test('plain functions passed as component arguments can be used as helpers', async function (assert) {
    function hello() {
      return 'hello';
    }

    let FooBar = <template>{{(@hello)}}</template>;

    await render(<template><FooBar @hello={{hello}} /></template>);

    assert.dom().hasText('hello');
  });

  test('plain functions stored as class properties can be used as helpers', async function (assert) {
    class FooBar extends Component {
      hello = () => {
        return 'hello';
      };

      <template>{{(this.hello)}}</template>
    }

    await render(<template><FooBar /></template>);

    assert.dom().hasText('hello');
  });

  test('class methods can be used as helpers', async function (assert) {
    class FooBar extends Component {
      hello() {
        return 'hello';
      }

      <template>{{(this.hello)}}</template>
    }

    await render(<template><FooBar /></template>);

    assert.dom().hasText('hello');
  });

  test('actions can be used as helpers', async function (assert) {
    class FooBar extends Component {
      someProperty = 'hello';

      @action
      hello() {
        return this.someProperty;
      }

      <template>{{(this.hello)}}</template>
    }

    await render(<template><FooBar /></template>);

    assert.dom().hasText('hello');
  });
});
