import { castToBrowser } from '@glimmer/debug-util';
import {
  GlimmerishComponent,
  jitSuite,
  RenderTest,
  test,
} from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler/runtime';

class KeywordArrayRuntime extends RenderTest {
  static suiteName = 'keyword helper: array (runtime)';

  @test
  'explicit scope'(assert: Assert) {
    let receivedData: unknown[] | undefined;

    let capture = (data: unknown[]) => {
      receivedData = data;
      assert.step('captured');
    };

    const compiled = template(
      '<button {{on "click" (fn capture (array "hello" "goodbye"))}}>Click</button>',
      {
        strictMode: true,
        scope: () => ({
          capture,
        }),
      }
    );

    this.renderComponent(compiled);

    castToBrowser(this.element, 'div').querySelector('button')!.click();
    assert.verifySteps(['captured']);
    assert.deepEqual(receivedData, ['hello', 'goodbye']);
  }

  @test
  'implicit scope'(assert: Assert) {
    let receivedData: unknown[] | undefined;

    let capture = (data: unknown[]) => {
      receivedData = data;
      assert.step('captured');
    };

    hide(capture);

    const compiled = template(
      '<button {{on "click" (fn capture (array "hello" "goodbye"))}}>Click</button>',
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
    assert.deepEqual(receivedData, ['hello', 'goodbye']);
  }

  @test
  'MustacheStatement with explicit scope'(assert: Assert) {
    let receivedData: unknown[] | undefined;

    let capture = (data: unknown[]) => {
      receivedData = data;
      assert.step('captured');
    };

    const Child = template('<button {{on "click" (fn capture @items)}}>Click</button>', {
      strictMode: true,
      scope: () => ({ capture }),
    });

    const compiled = template('<Child @items={{array "hello" "goodbye"}} />', {
      strictMode: true,
      scope: () => ({
        Child,
      }),
    });

    this.renderComponent(compiled);

    castToBrowser(this.element, 'div').querySelector('button')!.click();
    assert.verifySteps(['captured']);
    assert.deepEqual(receivedData, ['hello', 'goodbye']);
  }

  @test
  'no eval and no scope'(assert: Assert) {
    let receivedData: unknown[] | undefined;

    class Foo extends GlimmerishComponent {
      static {
        template(
          '<button {{on "click" (fn this.capture (array "hello" "goodbye"))}}>Click</button>',
          {
            strictMode: true,
            component: this,
          }
        );
      }

      capture = (data: unknown[]) => {
        receivedData = data;
        assert.step('captured');
      };
    }

    this.renderComponent(Foo);

    castToBrowser(this.element, 'div').querySelector('button')!.click();
    assert.verifySteps(['captured']);
    assert.deepEqual(receivedData, ['hello', 'goodbye']);
  }
}

jitSuite(KeywordArrayRuntime);

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
