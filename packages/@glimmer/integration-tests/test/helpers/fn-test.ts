import { type CapturedArguments } from '@glimmer/interfaces';
import { createInvokableRef } from '@glimmer/reference';
import { HAS_NATIVE_PROXY } from '@glimmer/util';

import { GlimmerishComponent, jitSuite, RenderTest, test } from '../..';

class FnTest extends RenderTest {
  static suiteName = 'Helpers test: {{fn}}';

  stashedFn?: () => unknown;

  beforeEach() {
    this.registerHelper('invoke', ([fn]) => {
      return (fn as () => unknown)();
    });

    let testContext = this;

    this.registerComponent(
      'Glimmer',
      'Stash',
      '',
      class extends GlimmerishComponent {
        constructor(owner: object, args: Record<string, unknown>) {
          super(owner, args);
          testContext.stashedFn = args['stashedFn'] as () => unknown;
        }
      }
    );
  }

  @test
  'updates when arguments change'() {
    this.render(`{{invoke (fn this.myFunc this.arg1 this.arg2)}}`, {
      myFunc(arg1: string, arg2: string) {
        return `arg1: ${arg1}, arg2: ${arg2}`;
      },

      arg1: 'foo',
      arg2: 'bar',
    });

    this.assertHTML('arg1: foo, arg2: bar');

    this.assertStableRerender();

    this.rerender({ arg1: 'qux' });
    this.assertHTML('arg1: qux, arg2: bar');

    this.rerender({ arg2: 'derp' });
    this.assertHTML('arg1: qux, arg2: derp');

    this.rerender({ arg1: 'foo', arg2: 'bar' });
    this.assertHTML('arg1: foo, arg2: bar');
  }

  @test
  'updates when the function changes'() {
    let func1 = (arg1: string, arg2: string) => `arg1: ${arg1}, arg2: ${arg2}`;
    let func2 = (arg1: string, arg2: string) => `arg2: ${arg2}, arg1: ${arg1}`;

    this.render(`{{invoke (fn this.myFunc this.arg1 this.arg2)}}`, {
      myFunc: func1,

      arg1: 'foo',
      arg2: 'bar',
    });

    this.assertHTML('arg1: foo, arg2: bar');
    this.assertStableRerender();

    this.rerender({ myFunc: func2 });
    this.assertHTML('arg2: bar, arg1: foo');

    this.rerender({ myFunc: func1 });
    this.assertHTML('arg1: foo, arg2: bar');
  }

  @test
  'a stashed fn result update arguments when invoked'(assert: Assert) {
    this.render(`<Stash @stashedFn={{fn this.myFunc this.arg1 this.arg2}}/>`, {
      myFunc(arg1: string, arg2: string) {
        return `arg1: ${arg1}, arg2: ${arg2}`;
      },

      arg1: 'foo',
      arg2: 'bar',
    });

    assert.strictEqual(this.stashedFn?.(), 'arg1: foo, arg2: bar');

    this.rerender({ arg1: 'qux' });
    assert.strictEqual(this.stashedFn?.(), 'arg1: qux, arg2: bar');

    this.rerender({ arg2: 'derp' });
    assert.strictEqual(this.stashedFn?.(), 'arg1: qux, arg2: derp');

    this.rerender({ arg1: 'foo', arg2: 'bar' });
    assert.strictEqual(this.stashedFn?.(), 'arg1: foo, arg2: bar');
  }

  @test
  'a stashed fn result invokes the correct function when the bound function changes'(
    assert: Assert
  ) {
    let func1 = (arg1: string, arg2: string) => `arg1: ${arg1}, arg2: ${arg2}`;
    let func2 = (arg1: string, arg2: string) => `arg2: ${arg2}, arg1: ${arg1}`;

    this.render(`<Stash @stashedFn={{fn this.myFunc this.arg1 this.arg2}}/>`, {
      myFunc: func1,

      arg1: 'foo',
      arg2: 'bar',
    });

    assert.strictEqual(this.stashedFn?.(), 'arg1: foo, arg2: bar');

    this.rerender({ myFunc: func2 });
    assert.strictEqual(this.stashedFn?.(), 'arg2: bar, arg1: foo');

    this.rerender({ myFunc: func1 });
    assert.strictEqual(this.stashedFn?.(), 'arg1: foo, arg2: bar');
  }

  @test
  'asserts if no argument given'(assert: Assert) {
    assert.throws(() => {
      this.render(`{{fn}}`, {
        myFunc: null,
        arg1: 'foo',
        arg2: 'bar',
      });
    }, /You must pass a function as the `fn` helper's first argument./);
  }

  @test
  'asserts if the first argument is undefined'(assert: Assert) {
    assert.throws(() => {
      this.render(`{{fn this.myFunc this.arg1 this.arg2}}`, {
        myFunc: undefined,
        arg1: 'foo',
        arg2: 'bar',
      });
    }, /You must pass a function as the `fn` helper's first argument, you passed undefined. While rendering:\n\nthis.myFunc/);
  }

  @test
  'asserts if the first argument is null'(assert: Assert) {
    assert.throws(() => {
      this.render(`{{fn this.myFunc this.arg1 this.arg2}}`, {
        myFunc: null,
        arg1: 'foo',
        arg2: 'bar',
      });
    }, /You must pass a function as the `fn` helper's first argument, you passed null. While rendering:\n\nthis.myFunc/);
  }

  @test
  'asserts if the provided function accesses `this` without being bound prior to passing to fn'(
    assert: Assert
  ) {
    if (!HAS_NATIVE_PROXY) {
      return;
    }

    this.render(`<Stash @stashedFn={{fn this.myFunc this.arg1}}/>`, {
      myFunc(arg1: string) {
        return `arg1: ${arg1}, arg2: ${this['arg2']}`;
      },

      arg1: 'foo',
      arg2: 'bar',
    });

    assert.throws(() => {
      this.stashedFn?.();
    }, /You accessed `this.arg2` from a function passed to the `fn` helper, but the function itself was not bound to a valid `this` context. Consider updating to use a bound function./);
  }

  @test
  'there is no `this` context within the callback'(assert: Assert) {
    if (HAS_NATIVE_PROXY) {
      return;
    }

    this.render(`<Stash @stashedFn={{fn this.myFunc this.arg1}}/>`, {
      myFunc() {
        assert.strictEqual(this, null, 'this is bound to null in production builds');
      },
    });

    this.stashedFn?.();
  }

  @test
  'can use `this` if bound prior to passing to fn'(assert: Assert) {
    let context = {
      myFunc(arg1: string) {
        return `arg1: ${arg1}, arg2: ${this.arg2}`;
      },

      arg1: 'foo',
      arg2: 'bar',
    };

    context.myFunc = context.myFunc.bind(context);

    this.render(`<Stash @stashedFn={{fn this.myFunc this.arg1}}/>`, context);

    assert.strictEqual(this.stashedFn?.(), 'arg1: foo, arg2: bar');
  }

  @test
  'partially applies each layer when nested [GH#17959]'() {
    this.render(`{{invoke (fn (fn (fn this.myFunc this.arg1) this.arg2) this.arg3)}}`, {
      myFunc(arg1: string, arg2: string, arg3: string) {
        return `arg1: ${arg1}, arg2: ${arg2}, arg3: ${arg3}`;
      },

      arg1: 'foo',
      arg2: 'bar',
      arg3: 'qux',
    });

    this.assertHTML('arg1: foo, arg2: bar, arg3: qux');
    this.assertStableRerender();

    this.rerender({ arg1: 'qux' });
    this.assertHTML('arg1: qux, arg2: bar, arg3: qux');

    this.rerender({ arg2: 'derp' });
    this.assertHTML('arg1: qux, arg2: derp, arg3: qux');

    this.rerender({ arg3: 'huzzah' });
    this.assertHTML('arg1: qux, arg2: derp, arg3: huzzah');

    this.rerender({ arg1: 'foo', arg2: 'bar', arg3: 'qux' });
    this.assertHTML('arg1: foo, arg2: bar, arg3: qux');
  }

  @test
  'can be used on the result of `mut`'() {
    this.registerInternalHelper('mut', (args: CapturedArguments) => {
      let [first] = this.guardArray({ positional: args.positional }, { min: 1 });
      return createInvokableRef(first);
    });

    this.render(`{{this.arg1}}<Stash @stashedFn={{fn (mut this.arg1) this.arg2}}/>`, {
      arg1: 'foo',
      arg2: 'bar',
    });

    this.assertHTML('foo<!---->');

    this.stashedFn?.();
    this.rerender();

    this.assertHTML('bar<!---->');
  }

  @test
  'can be used on the result of `mut` with a falsy value'() {
    this.registerInternalHelper('mut', (args: CapturedArguments) => {
      let [first] = this.guardArray({ positional: args.positional }, { min: 1 });
      return createInvokableRef(first);
    });

    this.render(`{{this.arg1}}<Stash @stashedFn={{fn (mut this.arg1) this.arg2}}/>`, {
      arg1: 'foo',
      arg2: false,
    });

    this.assertHTML('foo<!---->');

    this.stashedFn?.();
    this.rerender();

    this.assertHTML('false<!---->');
  }
}

jitSuite(FnTest);
