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
  'memoizes across repeated reads in a render'(assert: Assert) {
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

  @test
  'options.equals prevents downstream updates for equivalent recomputations'(assert: Assert) {
    const letters = trackedValue(['b', 'a']);
    const sorted = cachedValue(() => letters.value.slice().sort(), {
      equals: (a, b) => a.length === b.length && a.every((x, i) => x === b[i]),
    });
    const step = () => {
      const value = sorted.value.join('');
      assert.step(value);
      return value;
    };

    const List = defineComponent({ step }, '{{ (step) }}');

    this.renderComponent(List);

    this.assertHTML('ab');
    assert.verifySteps(['ab']);

    letters.set(['a', 'b']);
    this.rerender();

    this.assertHTML('ab');
    this.assertStableRerender();
    assert.verifySteps(['ab'], 'the step reran, receiving the retained value');
  }
}

jitSuite(CachedValueTest);
