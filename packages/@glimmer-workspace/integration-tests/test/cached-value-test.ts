import { cachedValue, trackedValue } from '@glimmer/validator';
import { defineComponent, jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

class CachedValueTest extends RenderTest {
  static suiteName = `cachedValue() (rendering)`;

  @test
  'renders and updates when an input changes'() {
    const count = trackedValue(0);
    const doubled = cachedValue(() => count.value * 2);

    const Counter = defineComponent({ doubled }, '{{doubled.value}}');

    this.renderComponent(Counter);

    this.assertHTML('0');

    count.set(1);
    this.rerender();

    this.assertHTML('2');
    this.assertStableRerender();
  }

  @test
  'caches across repeated reads in a render'(assert: Assert) {
    const count = trackedValue(1);
    const doubled = cachedValue(() => {
      assert.step(`computed:${count.value}`);
      return count.value * 2;
    });

    const Counter = defineComponent({ doubled }, '{{doubled.value}} and {{doubled.value}}');

    this.renderComponent(Counter);

    this.assertHTML('2 and 2');
    assert.verifySteps(['computed:1'], 'computed once for two reads');

    count.set(2);
    this.rerender();

    this.assertHTML('4 and 4');
    this.assertStableRerender();
    assert.verifySteps(['computed:2'], 'computed once after the input changed');
  }
}

jitSuite(CachedValueTest);
