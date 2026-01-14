import { castToBrowser } from '@glimmer/debug-util';
import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler/runtime';

class KeywordOn extends RenderTest {
  static suiteName = 'keyword modifier: on (runtime)';

  @test
  'explicit scope'(assert: Assert) {
    let handleClick = () => {
      assert.step('success');
    };

    const compiled = template('<button {{on "click" handleClick}}>Click</button>', {
      strictMode: true,
      scope: () => ({
        handleClick,
      }),
    });

    this.renderComponent(compiled);

    castToBrowser(this.element, 'div').querySelector('button')!.click();
    assert.verifySteps(['success']);
  }

  @test
  'implicit scope'(assert: Assert) {
    let handleClick = () => {
      assert.step('success');
    };

    hide(handleClick);

    const compiled = template('<button {{on "click" handleClick}}>Click</button>', {
      strictMode: true,
      eval() {
        return eval(arguments[0]);
      },
    });

    this.renderComponent(compiled);

    castToBrowser(this.element, 'div').querySelector('button')!.click();
    assert.verifySteps(['success']);
  }
}

jitSuite(KeywordOn);

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
