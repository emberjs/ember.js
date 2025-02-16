import type { RenderTest } from '@glimmer-workspace/integration-tests';
import { defineComponent } from '@glimmer-workspace/integration-tests';

const assert = QUnit.assert;

export function reactivityTest(context: RenderTest, Klass: any, shouldUpdate = true) {
  let instance;
  let count = 0;

  class TestComponent extends Klass {
    constructor(...args: unknown[]) {
      super(...args);
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      instance = this;
    }

    get value() {
      count++;

      return super.value;
    }
  }

  let comp = defineComponent({}, `<div class="test">{{this.value}}</div>`, {
    strictMode: true,
    definition: TestComponent,
  });

  context.renderComponent(comp);

  assert.equal(count, 1, 'The count is 1');

  instance.update();

  context.rerender();

  assert.equal(
    count,
    shouldUpdate ? 2 : 1,
    shouldUpdate ? `The count is updated` : `The could should not update`
  );
}
