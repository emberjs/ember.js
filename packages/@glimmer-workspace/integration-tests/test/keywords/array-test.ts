import { castToBrowser } from '@glimmer/debug-util';
import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler/runtime';
import { array } from '@ember/helper';

class KeywordArray extends RenderTest {
  static suiteName = 'keyword helper: array';

  @test
  'it works with explicit scope'(assert: Assert) {
    let handleClick = (items: unknown[]) => {
      assert.step(`count:${items.length}`);
    };

    const compiled = template(
      '<button {{on "click" (fn handleClick (array "a" "b" "c"))}}>Click</button>',
      {
        strictMode: true,
        scope: () => ({
          handleClick,
          array,
        }),
      }
    );

    this.renderComponent(compiled);

    castToBrowser(this.element, 'div').querySelector('button')!.click();
    assert.verifySteps(['count:3']);
  }

  @test
  'it works as a keyword (no import needed)'(assert: Assert) {
    let handleClick = (items: unknown[]) => {
      assert.step(`count:${items.length}`);
    };

    const compiled = template(
      '<button {{on "click" (fn handleClick (array "a" "b" "c"))}}>Click</button>',
      {
        strictMode: true,
        scope: () => ({
          handleClick,
        }),
      }
    );

    this.renderComponent(compiled);

    castToBrowser(this.element, 'div').querySelector('button')!.click();
    assert.verifySteps(['count:3']);
  }

  @test
  'it works with the runtime compiler'(assert: Assert) {
    let handleClick = (items: unknown[]) => {
      assert.step(`count:${items.length}`);
    };

    hide(handleClick);

    const compiled = template(
      '<button {{on "click" (fn handleClick (array "a" "b" "c"))}}>Click</button>',
      {
        strictMode: true,
        eval() {
          return eval(arguments[0]);
        },
      }
    );

    this.renderComponent(compiled);

    castToBrowser(this.element, 'div').querySelector('button')!.click();
    assert.verifySteps(['count:3']);
  }
}

jitSuite(KeywordArray);

const hide = (variable: unknown) => {
  new Function(`return (${JSON.stringify(variable)});`);
};
