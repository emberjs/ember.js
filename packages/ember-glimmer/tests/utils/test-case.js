export { TestCase, moduleFor } from './abstract-test-case';
import { RenderingTest as AbstractRenderingTest } from './abstract-test-case';

export class RenderingTest extends AbstractRenderingTest {
  runTask(callback) {
    super.runTask(() => {
      callback();
      this.component.rerender();
    });
  }
}
