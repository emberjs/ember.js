import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';
import { action } from '@ember/object';
import { getOwner, setOwner } from '@ember/owner';
import Service from '@ember/service';
import { invokeHelper } from '@ember/helper';
import { getValue } from '@glimmer/tracking/primitives/cache';

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

  test('getOwner() returns the owner of the test', async function (assert) {
    let owner = this.owner;

    function hello() {
      assert.strictEqual(getOwner(), owner);

      return 'hello';
    }

    await render(<template>{{(hello)}}</template>);

    assert.dom().hasText('hello');
  });

  test('getOwner() can look up a service', async function (assert) {
    class Greeter extends Service {
      @tracked greeting = 'hello';
    }

    this.owner.register('service:greeter', Greeter);

    function greet(name) {
      return `${getOwner().lookup('service:greeter').greeting} ${name}`;
    }

    await render(<template>{{greet "world"}}</template>);

    assert.dom().hasText('hello world');

    this.owner.lookup('service:greeter').greeting = 'goodbye';
    await settled();

    assert.dom().hasText('goodbye world');
  });

  test('getOwner() works in nested function helpers', async function (assert) {
    let owner = this.owner;

    function inner() {
      assert.step('inner');
      assert.strictEqual(getOwner(), owner);

      return 'inner';
    }

    function outer(value) {
      assert.step('outer');
      assert.strictEqual(getOwner(), owner);

      return `outer ${value}`;
    }

    await render(<template>{{outer (inner)}}</template>);

    assert.dom().hasText('outer inner');
    assert.verifySteps(['inner', 'outer']);
  });

  test('getOwner() works with invokeHelper', function (assert) {
    let owner = this.owner;
    let parent = {};

    setOwner(parent, owner);

    function hello() {
      return getOwner();
    }

    assert.strictEqual(getValue(invokeHelper(parent, hello)), owner);
  });

  test('the owner scope ends when the function helper throws', function (assert) {
    function hello() {
      getOwner();

      throw new Error('from the helper');
    }

    assert.throws(() => getValue(invokeHelper(this.owner, hello)), /from the helper/);
    assert.throws(() => getOwner(), /there is no active owner/);
  });

  test('getOwner() throws outside of a function helper', async function (assert) {
    let later;

    function hello() {
      later = () => getOwner();

      return 'hello';
    }

    await render(<template>{{(hello)}}</template>);

    assert.throws(() => getOwner(), /there is no active owner/);
    assert.throws(() => later(), /there is no active owner/);
  });
});
