import { castToBrowser } from '@glimmer/debug-util';
import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler/runtime';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';

class KeywordFn extends RenderTest {
  static suiteName = 'keyword helper: fn';

  /**
   * We require the babel compiler to emit keywords, so this is actually no different than normal usage
   * prior to RFC 998.
   *
   * We are required to have the compiler that emits this low-level format to detect if fn is in scope and then
   * _not_ add the `fn` helper from `@ember/helper` import.
   */
  @test
  'it works'(assert: Assert) {
    let greet = (greeting: string) => {
      assert.step(greeting);
    };

    const compiled = template('<button {{on "click" (fn greet "hello")}}>Click</button>', {
      strictMode: true,
      scope: () => ({
        greet,
        fn,
        on,
      }),
    });

    this.renderComponent(compiled);

    castToBrowser(this.element, 'div').querySelector('button')!.click();
    assert.verifySteps(['hello']);
  }

  @test
  'it works with the runtime compiler'(assert: Assert) {
    let greet = (greeting: string) => {
      assert.step(greeting);
    };

    hide(greet);

    const compiled = template('<button {{on "click" (fn greet "hello")}}>Click</button>', {
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
  'it works as a MustacheStatement'(assert: Assert) {
    let greet = (greeting: string) => {
      assert.step(greeting);
    };

    const Child = template('<button {{on "click" @callback}}>Click</button>', {
      strictMode: true,
      scope: () => ({ on }),
    });

    const compiled = template('<Child @callback={{fn greet "hello"}} />', {
      strictMode: true,
      scope: () => ({
        greet,
        fn,
        Child,
      }),
    });

    this.renderComponent(compiled);

    castToBrowser(this.element, 'div').querySelector('button')!.click();
    assert.verifySteps(['hello']);
  }

  @test
  'can be shadowed'(assert: Assert) {
    let fn = () => {
      assert.step('shadowed:success');
      return () => {};
    };

    let greet = () => {};

    const compiled = template('<button {{on "click" (fn greet "hello")}}>Click</button>', {
      strictMode: true,
      scope: () => ({ fn, greet, on }),
    });

    this.renderComponent(compiled);
    assert.verifySteps(['shadowed:success']);
  }
}

jitSuite(KeywordFn);

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
