import { castToBrowser } from '@glimmer/debug-util';
import {
  GlimmerishComponent,
  jitSuite,
  RenderTest,
  test,
} from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler/runtime';

class KeywordHashRuntime extends RenderTest {
  static suiteName = 'keyword helper: hash (runtime)';

  @test
  'explicit scope'(assert: Assert) {
    let receivedData: Record<string, unknown> | undefined;

    let capture = (data: Record<string, unknown>) => {
      receivedData = data;
      assert.step('captured');
    };

    const compiled = template('{{capture (hash greeting="hello" farewell="goodbye")}}', {
      strictMode: true,
      scope: () => ({
        capture,
      }),
    });

    this.renderComponent(compiled);

    assert.verifySteps(['captured']);
    assert.strictEqual(receivedData?.['greeting'], 'hello');
    assert.strictEqual(receivedData?.['farewell'], 'goodbye');
  }

  @test
  'implicit scope'(assert: Assert) {
    let receivedData: Record<string, unknown> | undefined;

    let capture = (data: Record<string, unknown>) => {
      receivedData = data;
      assert.step('captured');
    };

    hide(capture);

    const compiled = template('{{capture (hash greeting="hello")}}', {
      strictMode: true,
      eval() {
        return eval(arguments[0]);
      },
    });

    this.renderComponent(compiled);

    assert.verifySteps(['captured']);
    assert.strictEqual(receivedData?.['greeting'], 'hello');
  }

  @test
  'implicit scope (shadowing)'(assert: Assert) {
    let receivedData: string | undefined;

    const hash = (data: string) => {
      receivedData = data;
    };

    hide(hash);

    const compiled = template('{{hash "hello"}}', {
      strictMode: true,
      eval() {
        return eval(arguments[0]);
      },
    });

    this.renderComponent(compiled);

    assert.strictEqual(receivedData, 'hello');
  }

  @test
  'MustacheStatement with explicit scope'(assert: Assert) {
    let receivedData: Record<string, unknown> | undefined;

    let capture = (data: Record<string, unknown>) => {
      receivedData = data;
      assert.step('captured');
    };

    const Child = template('{{capture @data}}', {
      strictMode: true,
      scope: () => ({ capture }),
    });

    const compiled = template('<Child @data={{hash greeting="hello"}} />', {
      strictMode: true,
      scope: () => ({
        Child,
      }),
    });

    this.renderComponent(compiled);

    assert.verifySteps(['captured']);
    assert.strictEqual(receivedData?.['greeting'], 'hello');
  }

  @test
  'no eval and no scope'(assert: Assert) {
    let receivedData: Record<string, unknown> | undefined;

    class Foo extends GlimmerishComponent {
      static {
        template(
          '<button {{on "click" (fn this.capture (hash greeting="hello"))}}>Click</button>',
          {
            strictMode: true,
            component: this,
          }
        );
      }

      capture = (data: Record<string, unknown>) => {
        receivedData = data;
        assert.step('captured');
      };
    }

    this.renderComponent(Foo);

    castToBrowser(this.element, 'div').querySelector('button')!.click();
    assert.verifySteps(['captured']);
    assert.strictEqual(receivedData?.['greeting'], 'hello');
  }
}

jitSuite(KeywordHashRuntime);

/**
 * This function is used to hide a variable from the transpiler, so that it
 * doesn't get removed as "unused". It does not actually do anything with the
 * variable, it just makes it be part of an expression that the transpiler
 * won't remove.
 *
 * It's a bit of a hack, but it's necessary for testing.
 *
 * @param variable The variable to hide.
 */
const hide = (variable: unknown) => {
  new Function(`return (${JSON.stringify(variable)});`);
};
