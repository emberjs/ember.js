import { castToBrowser } from '@glimmer/debug-util';
import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';
import { DEBUG } from '@glimmer/env';

class KeywordOn extends RenderTest {
  static suiteName = 'keyword modifier: on';

  @test
  'it works'(assert: Assert) {
    let handleClick = () => {
      assert.step('success');
    };

    this.renderComponent(
        <template>
            <button {{on "click" handleClick}}>Click</button>
        </template>
    );

    castToBrowser(this.element, 'div').querySelector('button')!.click();
    assert.verifySteps(['success']);
  }
}

jitSuite(KeywordOn);
