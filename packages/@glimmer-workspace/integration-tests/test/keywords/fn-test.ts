import { castToBrowser } from '@glimmer/debug-util';
import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';
import { setHelperManager, helperCapabilities } from '@glimmer/manager';

import { template } from '@ember/template-compiler/runtime';
import { fn } from '@ember/helper';

class KeywordFn extends RenderTest {
  static suiteName = 'keyword helper: fn';

  @test
  'it works with explicit scope'(assert: Assert) {
    let handleClick = (msg: string) => {
      assert.step(msg);
    };

    const compiled = template('<button {{on "click" (fn handleClick "hello")}}>Click</button>', {
      strictMode: true,
      scope: () => ({
        handleClick,
        fn,
      }),
    });

    this.renderComponent(compiled);

    castToBrowser(this.element, 'div').querySelector('button')!.click();
    assert.verifySteps(['hello']);
  }

  @test
  'it works as a keyword (no import needed)'(assert: Assert) {
    let handleClick = (msg: string) => {
      assert.step(msg);
    };

    const compiled = template('<button {{on "click" (fn handleClick "hello")}}>Click</button>', {
      strictMode: true,
      scope: () => ({
        handleClick,
      }),
    });

    this.renderComponent(compiled);

    castToBrowser(this.element, 'div').querySelector('button')!.click();
    assert.verifySteps(['hello']);
  }

  @test
  'it works with the runtime compiler'(assert: Assert) {
    let handleClick = (msg: string) => {
      assert.step(msg);
    };

    hide(handleClick);

    const compiled = template('<button {{on "click" (fn handleClick "hello")}}>Click</button>', {
      strictMode: true,
      eval() {
        return eval(arguments[0]);
      },
    });

    this.renderComponent(compiled);

    castToBrowser(this.element, 'div').querySelector('button')!.click();
    assert.verifySteps(['hello']);
  }

  @test
  'can be shadowed'() {
    let fn = setHelperManager(
      () => ({
        capabilities: helperCapabilities('3.23', { hasValue: true }),
        createHelper() {
          return {};
        },
        getValue() {
          return 'shadowed';
        },
      }),
      {}
    );

    const compiled = template('{{fn "anything"}}', {
      strictMode: true,
      scope: () => ({ fn }),
    });

    this.renderComponent(compiled);
    this.assertHTML('shadowed');
  }
}

jitSuite(KeywordFn);

const hide = (variable: unknown) => {
  new Function(`return (${JSON.stringify(variable)});`);
};
