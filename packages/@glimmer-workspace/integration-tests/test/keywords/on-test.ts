import { castToBrowser } from '@glimmer/debug-util';
import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';
import { setModifierManager, modifierCapabilities } from '@glimmer/manager';

import { template } from '@ember/template-compiler/runtime';
import { on } from '@ember/modifier';

class KeywordOn extends RenderTest {
  static suiteName = 'keyword modifier: on';

  /**
   * We require the babel compiler to emit keywords, so this is actually no different than normal usage
   * prior to RFC 997.
   *
   * We are required to have the compiler that emits this low-level format to detect if on is in scope and then
   * _not_ add the `on` modifier from `@ember/modifier` import.
   */
  @test
  'it works'(assert: Assert) {
    let handleClick = () => {
      assert.step('success');
    };

    const compiled = template('<button {{on "click" handleClick}}>Click</button>', {
      strictMode: true,
      scope: () => ({
        handleClick,
        on,
      }),
    });

    this.renderComponent(compiled);

    castToBrowser(this.element, 'div').querySelector('button')!.click();
    assert.verifySteps(['success']);
  }

  @test
  'it works with the runtime compiler'(assert: Assert) {
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

  @test
  'can be shadowed'(assert: Assert) {
    let on = setModifierManager(() => {
      return {
        capabilities: modifierCapabilities('3.22'),
        createModifier() {
          assert.step('shadowed:success');
        },
        installModifier() {},
        updateModifier() {},
        destroyModifier() {},
      };
    }, {});

    const compiled = template('<button {{on "click"}}>Click</button>', {
      strictMode: true,
      scope: () => ({ on }),
    });

    this.renderComponent(compiled);

    castToBrowser(this.element, 'div').querySelector('button')!.click();
    assert.verifySteps(['shadowed:success']);
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
