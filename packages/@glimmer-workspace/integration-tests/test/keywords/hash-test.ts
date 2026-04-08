import { castToBrowser } from '@glimmer/debug-util';
import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler/runtime';
import { fn, hash } from '@ember/helper';
import { on } from '@ember/modifier';

class KeywordHash extends RenderTest {
  static suiteName = 'keyword helper: hash';

  @test
  'it works'(assert: Assert) {
    let receivedData: Record<string, unknown> | undefined;

    let capture = (data: Record<string, unknown>) => {
      receivedData = data;
      assert.step('captured');
    };

    const compiled = template(
      '<button {{on "click" (fn capture (hash greeting="hello" farewell="goodbye"))}}>Click</button>',
      {
        strictMode: true,
        scope: () => ({
          capture,
          fn,
          hash,
          on,
        }),
      }
    );

    this.renderComponent(compiled);

    castToBrowser(this.element, 'div').querySelector('button')!.click();
    assert.verifySteps(['captured']);
    assert.strictEqual(receivedData?.['greeting'], 'hello');
    assert.strictEqual(receivedData?.['farewell'], 'goodbye');
  }

  @test
  'it works with the runtime compiler'(assert: Assert) {
    let receivedData: Record<string, unknown> | undefined;

    let capture = (data: Record<string, unknown>) => {
      receivedData = data;
      assert.step('captured');
    };

    hide(capture);

    const compiled = template(
      '<button {{on "click" (fn capture (hash greeting="hello"))}}>Click</button>',
      {
        strictMode: true,
        eval() {
          return eval(arguments[0]);
        },
      }
    );

    this.renderComponent(compiled);

    castToBrowser(this.element, 'div').querySelector('button')!.click();
    assert.verifySteps(['captured']);
    assert.strictEqual(receivedData?.['greeting'], 'hello');
  }

  @test
  'it works as a MustacheStatement'(assert: Assert) {
    let receivedData: Record<string, unknown> | undefined;

    let capture = (data: Record<string, unknown>) => {
      receivedData = data;
      assert.step('captured');
    };

    const Child = template('<button {{on "click" (fn capture @data)}}>Click</button>', {
      strictMode: true,
      scope: () => ({ on, fn, capture }),
    });

    const compiled = template('<Child @data={{hash greeting="hello"}} />', {
      strictMode: true,
      scope: () => ({
        hash,
        Child,
      }),
    });

    this.renderComponent(compiled);

    castToBrowser(this.element, 'div').querySelector('button')!.click();
    assert.verifySteps(['captured']);
    assert.strictEqual(receivedData?.['greeting'], 'hello');
  }
}

jitSuite(KeywordHash);

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
