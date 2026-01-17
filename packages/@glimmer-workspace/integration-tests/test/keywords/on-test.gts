import { castToBrowser } from '@glimmer/debug-util';
import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';
import { setModifierManager, modifierCapabilities } from '@glimmer/manager';

import { template } from '@ember/template-compiler/runtime';

class KeywordOn extends RenderTest {
  static suiteName = 'keyword modifier: on';

  @test
  'it works'(assert: Assert) {
    let handleClick = () => {
      assert.step('success');
    };

    const compiled = template('<button {{on "click" handleClick}}>Click</button>', {
      strictMode: true,
      scope: () => ({
        handleClick,
      })
    });

    debugger;
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
