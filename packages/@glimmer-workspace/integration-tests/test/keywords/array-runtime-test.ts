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
  'it works'() {
    const compiled = template('{{JSON.stringify (array "hello" "goodbye")}}', {
      strictMode: true,
      scope: () => ({ JSON }),
    });

    this.renderComponent(compiled);
    this.assertHTML('["hello","goodbye"]');
  }

  @test
  'it works (shadowed)'() {
    const array = (x: string) => x.toUpperCase();
    const compiled = template('{{array "hello"}}', {
      strictMode: true,
      scope: () => ({ JSON, array }),
    });

    this.renderComponent(compiled);
    this.assertHTML('HELLO');
  }

  @test
  'implicit scope'() {
    const compiled = template('{{JSON.stringify (array "hello" "goodbye")}}', {
      strictMode: true,
      eval() {
        return eval(arguments[0]);
      },
    });

    this.renderComponent(compiled);
    this.assertHTML('["hello","goodbye"]');
  }

  @test
  'implicit scope (shadowed)'() {
    const array = (...data: string[]) => data.reverse();

    hide(array);

    const compiled = template('{{JSON.stringify (array "hello" "goodbye")}}', {
      strictMode: true,
      eval() {
        return eval(arguments[0]);
      },
    });

    this.renderComponent(compiled);
    this.assertHTML('["goodbye","hello"]');
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
