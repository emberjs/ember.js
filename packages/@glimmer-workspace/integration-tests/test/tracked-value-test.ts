import { trackedValue } from '@glimmer/validator';
import {
  defineComponent,
  GlimmerishComponent as Component,
  jitSuite,
  RenderTest,
  test,
} from '@glimmer-workspace/integration-tests';

class TrackedValueTest extends RenderTest {
  static suiteName = `trackedValue() (rendering)`;

  @test
  'renders and updates when set'() {
    const count = trackedValue(0);

    const Counter = defineComponent({ count }, '{{count.value}}');

    this.renderComponent(Counter);

    this.assertHTML('0');

    count.set(1);
    this.rerender();

    this.assertHTML('1');
    this.assertStableRerender();
  }

  @test
  'default equals does not dirty on no-op changes'(assert: Assert) {
    const count = trackedValue(0);
    const step = () => {
      assert.step(String(count.value));
      return count.value;
    };

    const Counter = defineComponent({ step }, '{{ (step) }}');

    this.renderComponent(Counter);

    this.assertHTML('0');
    assert.verifySteps(['0']);

    count.set(0);
    this.rerender();

    this.assertHTML('0');
    this.assertStableRerender();
    assert.verifySteps([]);
  }

  @test
  'options.equals: () => false dirties on every set'(assert: Assert) {
    const count = trackedValue(0, { equals: () => false });
    const step = () => {
      assert.step(String(count.value));
      return count.value;
    };

    const Counter = defineComponent({ step }, '{{ (step) }}');

    this.renderComponent(Counter);

    this.assertHTML('0');
    assert.verifySteps(['0']);

    count.set(0);
    this.rerender();

    this.assertHTML('0');
    this.assertStableRerender();
    assert.verifySteps(['0']);
  }

  @test
  'value assignment'() {
    this.assertReactivity(
      class extends Component {
        count = trackedValue(0);

        get value() {
          return this.count.value;
        }

        update() {
          this.count.value++;
        }
      }
    );
  }
}

jitSuite(TrackedValueTest);
