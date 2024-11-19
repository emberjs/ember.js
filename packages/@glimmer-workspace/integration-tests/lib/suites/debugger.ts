import { resetDebuggerCallback, setDebuggerCallback } from '@glimmer/runtime';

import { GlimmerishComponent } from '../components';
import { RenderTest } from '../render-test';
import { test } from '../test-decorator';

export class DebuggerSuite extends RenderTest {
  static suiteName = 'Debugger';

  afterEach() {
    resetDebuggerCallback();
  }

  @test({
    kind: 'templateOnly',
  })
  'basic debugger statement'() {
    let expectedContext = {
      foo: 'bar',
      a: {
        b: true,
      },
      used: 'named',
    };
    let callbackExecuted = 0;

    setDebuggerCallback((context: any, get) => {
      callbackExecuted++;
      this.assert.strictEqual(context.foo, expectedContext.foo, 'reading from the context');
      this.assert.strictEqual(get('foo'), expectedContext.foo, 'reading from a local');
      this.assert.strictEqual(get('@a'), expectedContext.a, 'reading from an unused named args');
      this.assert.strictEqual(get('@used'), expectedContext.used, 'reading from a used named args');
    });

    this.registerComponent(
      'Glimmer',
      'MyComponent',
      '{{#if this.a.b}}true{{debugger}}{{else}}false{{debugger}}{{/if}}{{@used}}',
      class extends GlimmerishComponent {
        declare args: { a: { b: boolean }; foo: string; used: string };

        get a() {
          return this.args.a;
        }

        get foo() {
          return this.args.foo;
        }
      }
    );

    this.render(
      `<MyComponent @foo={{this.foo}} @used={{this.used}} @a={{this.a}}/>`,
      expectedContext
    );

    this.assert.strictEqual(callbackExecuted, 1);
    this.assertHTML('truenamed');
    this.assertStableRerender();

    expectedContext = {
      foo: 'baz',
      a: {
        b: false,
      },
      used: 'named',
    };
    this.rerender(expectedContext);
    this.assert.strictEqual(callbackExecuted, 2);
    this.assertHTML('falsenamed');
    this.assertStableNodes();

    expectedContext = {
      foo: 'bar',
      a: {
        b: true,
      },
      used: 'named',
    };
    this.rerender(expectedContext);
    this.assert.strictEqual(callbackExecuted, 3);
    this.assertHTML('truenamed');
    this.assertStableNodes();
  }

  @test
  'can get locals'() {
    let expectedContext = {
      foo: 'bar',
      a: {
        b: true,
      },
    };
    let callbackExecuted = 0;

    setDebuggerCallback((context: any, get) => {
      callbackExecuted++;
      this.assert.strictEqual(get('foo'), expectedContext.foo);
      this.assert.strictEqual(get('bar'), expectedContext.foo);
      this.assert.deepEqual(get('this'), context);
    });

    this.render(
      '{{#let this.foo as |bar|}}{{#if this.a.b}}true{{debugger}}{{else}}false{{debugger}}{{/if}}{{/let}}',
      expectedContext
    );
    this.assert.strictEqual(callbackExecuted, 1);
    this.assertHTML('true');
    this.assertStableRerender();

    expectedContext = {
      foo: 'baz',
      a: {
        b: false,
      },
    };
    this.rerender(expectedContext);
    this.assert.strictEqual(callbackExecuted, 2);
    this.assertHTML('false');
    this.assertStableNodes();

    expectedContext = {
      foo: 'bar',
      a: {
        b: true,
      },
    };
    this.rerender(expectedContext);
    this.assert.strictEqual(callbackExecuted, 3);
    this.assertHTML('true');
    this.assertStableNodes();
  }
}
