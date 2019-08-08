import { set } from '@ember/-internals/metal';
import { HAS_NATIVE_PROXY } from '@ember/-internals/utils';
import { DEBUG } from '@glimmer/env';
import { RenderingTestCase, moduleFor, runTask } from 'internal-test-helpers';
import { Component } from '../../utils/helpers';

moduleFor(
  'Helpers test: {{fn}}',
  class extends RenderingTestCase {
    beforeEach() {
      this.registerHelper('invoke', function([fn]) {
        return fn();
      });

      let testContext = this;
      this.registerComponent('stash', {
        ComponentClass: Component.extend({
          init() {
            this._super(...arguments);
            testContext.stashedFn = this.stashedFn;
          },
        }),
      });
    }

    '@test updates when arguments change'() {
      this.render(`{{invoke (fn this.myFunc this.arg1 this.arg2)}}`, {
        myFunc(arg1, arg2) {
          return `arg1: ${arg1}, arg2: ${arg2}`;
        },

        arg1: 'foo',
        arg2: 'bar',
      });

      this.assertText('arg1: foo, arg2: bar');

      this.assertStableRerender();

      runTask(() => set(this.context, 'arg1', 'qux'));
      this.assertText('arg1: qux, arg2: bar');

      runTask(() => set(this.context, 'arg2', 'derp'));
      this.assertText('arg1: qux, arg2: derp');

      runTask(() => {
        set(this.context, 'arg1', 'foo');
        set(this.context, 'arg2', 'bar');
      });

      this.assertText('arg1: foo, arg2: bar');
    }

    '@test updates when the function changes'() {
      let func1 = (arg1, arg2) => `arg1: ${arg1}, arg2: ${arg2}`;
      let func2 = (arg1, arg2) => `arg2: ${arg2}, arg1: ${arg1}`;

      this.render(`{{invoke (fn this.myFunc this.arg1 this.arg2)}}`, {
        myFunc: func1,

        arg1: 'foo',
        arg2: 'bar',
      });

      this.assertText('arg1: foo, arg2: bar');
      this.assertStableRerender();

      runTask(() => set(this.context, 'myFunc', func2));
      this.assertText('arg2: bar, arg1: foo');

      runTask(() => set(this.context, 'myFunc', func1));
      this.assertText('arg1: foo, arg2: bar');
    }

    '@test a stashed fn result update arguments when invoked'(assert) {
      this.render(`{{stash stashedFn=(fn this.myFunc this.arg1 this.arg2)}}`, {
        myFunc(arg1, arg2) {
          return `arg1: ${arg1}, arg2: ${arg2}`;
        },

        arg1: 'foo',
        arg2: 'bar',
      });

      assert.equal(this.stashedFn(), 'arg1: foo, arg2: bar');

      runTask(() => set(this.context, 'arg1', 'qux'));
      assert.equal(this.stashedFn(), 'arg1: qux, arg2: bar');

      runTask(() => set(this.context, 'arg2', 'derp'));
      assert.equal(this.stashedFn(), 'arg1: qux, arg2: derp');

      runTask(() => {
        set(this.context, 'arg1', 'foo');
        set(this.context, 'arg2', 'bar');
      });

      assert.equal(this.stashedFn(), 'arg1: foo, arg2: bar');
    }

    '@test a stashed fn result invokes the correct function when the bound function changes'(
      assert
    ) {
      let func1 = (arg1, arg2) => `arg1: ${arg1}, arg2: ${arg2}`;
      let func2 = (arg1, arg2) => `arg2: ${arg2}, arg1: ${arg1}`;

      this.render(`{{stash stashedFn=(fn this.myFunc this.arg1 this.arg2)}}`, {
        myFunc: func1,

        arg1: 'foo',
        arg2: 'bar',
      });

      assert.equal(this.stashedFn(), 'arg1: foo, arg2: bar');

      runTask(() => set(this.context, 'myFunc', func2));
      assert.equal(this.stashedFn(), 'arg2: bar, arg1: foo');

      runTask(() => set(this.context, 'myFunc', func1));
      assert.equal(this.stashedFn(), 'arg1: foo, arg2: bar');
    }

    '@test asserts if the first argument is not a function'() {
      expectAssertion(() => {
        this.render(`{{invoke (fn this.myFunc this.arg1 this.arg2)}}`, {
          myFunc: null,
          arg1: 'foo',
          arg2: 'bar',
        });
      }, /You must pass a function as the `fn` helpers first argument, you passed null/);
    }

    '@test asserts if the provided function accesses `this` without being bound prior to passing to fn'(
      assert
    ) {
      if (!HAS_NATIVE_PROXY) {
        assert.expect(0);
        return;
      }

      this.render(`{{stash stashedFn=(fn this.myFunc this.arg1)}}`, {
        myFunc(arg1) {
          return `arg1: ${arg1}, arg2: ${this.arg2}`;
        },

        arg1: 'foo',
        arg2: 'bar',
      });

      expectAssertion(() => {
        this.stashedFn();
      }, /You accessed `this.arg2` from a function passed to the `fn` helper, but the function itself was not bound to a valid `this` context. Consider updating to usage of `@action`./);
    }

    '@test there is no `this` context within the callback'(assert) {
      if (DEBUG && HAS_NATIVE_PROXY) {
        assert.expect(0);
        return;
      }

      this.render(`{{stash stashedFn=(fn this.myFunc this.arg1)}}`, {
        myFunc() {
          assert.strictEqual(this, null, 'this is bound to null in production builds');
        },
      });

      this.stashedFn();
    }

    '@test can use `this` if bound prior to passing to fn'(assert) {
      this.render(`{{stash stashedFn=(fn (action this.myFunc) this.arg1)}}`, {
        myFunc(arg1) {
          return `arg1: ${arg1}, arg2: ${this.arg2}`;
        },

        arg1: 'foo',
        arg2: 'bar',
      });

      assert.equal(this.stashedFn(), 'arg1: foo, arg2: bar');
    }

    '@test partially applies each layer when nested [GH#17959]'() {
      this.render(`{{invoke (fn (fn (fn this.myFunc this.arg1) this.arg2) this.arg3)}}`, {
        myFunc(arg1, arg2, arg3) {
          return `arg1: ${arg1}, arg2: ${arg2}, arg3: ${arg3}`;
        },

        arg1: 'foo',
        arg2: 'bar',
        arg3: 'qux',
      });

      this.assertText('arg1: foo, arg2: bar, arg3: qux');
      this.assertStableRerender();

      runTask(() => set(this.context, 'arg1', 'qux'));
      this.assertText('arg1: qux, arg2: bar, arg3: qux');

      runTask(() => set(this.context, 'arg2', 'derp'));
      this.assertText('arg1: qux, arg2: derp, arg3: qux');

      runTask(() => set(this.context, 'arg3', 'huzzah'));
      this.assertText('arg1: qux, arg2: derp, arg3: huzzah');

      runTask(() => {
        set(this.context, 'arg1', 'foo');
        set(this.context, 'arg2', 'bar');
        set(this.context, 'arg3', 'qux');
      });

      this.assertText('arg1: foo, arg2: bar, arg3: qux');
    }

    '@test can be used on the result of `mut`'() {
      this.render(`{{this.arg1}}{{stash stashedFn=(fn (mut this.arg1) this.arg2)}}`, {
        arg1: 'foo',
        arg2: 'bar',
      });

      this.assertText('foo');

      runTask(() => this.stashedFn());

      this.assertText('bar');
    }
  }
);
