import { castToBrowser } from '@glimmer/debug-util';
import {
  GlimmerishComponent,
  jitSuite,
  RenderTest,
  test,
} from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler/runtime';

class KeywordFn extends RenderTest {
  static suiteName = 'keyword helper: fn (runtime)';

  @test
  'explicit scope'(assert: Assert) {
    let greet = (greeting: string) => {
      assert.step(greeting);
    };

    const compiled = template('<button {{on "click" (fn greet "hello")}}>Click</button>', {
      strictMode: true,
      scope: () => ({
        greet,
      }),
    });

    this.renderComponent(compiled);

    castToBrowser(this.element, 'div').querySelector('button')!.click();
    assert.verifySteps(['hello']);
  }

  @test
  'implicit scope'(assert: Assert) {
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
  'MustacheStatement with explicit scope'(assert: Assert) {
    let greet = (greeting: string) => {
      assert.step(greeting);
    };

    const Child = template('<button {{on "click" @callback}}>Click</button>', {
      strictMode: true,
      scope: () => ({}),
    });

    const compiled = template('<Child @callback={{fn greet "hello"}} />', {
      strictMode: true,
      scope: () => ({
        greet,
        Child,
      }),
    });

    this.renderComponent(compiled);

    castToBrowser(this.element, 'div').querySelector('button')!.click();
    assert.verifySteps(['hello']);
  }

  @test
  'no eval and no scope'(assert: Assert) {
    class Foo extends GlimmerishComponent {
      static {
        template('<button {{on "click" (fn this.greet "hello")}}>Click</button>', {
          strictMode: true,
          component: this,
        });
      }

      greet = (greeting: string) => assert.step(greeting);
    }

    this.renderComponent(Foo);

    castToBrowser(this.element, 'div').querySelector('button')!.click();
    assert.verifySteps(['hello']);
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
