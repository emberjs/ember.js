import { moduleFor, RenderingTestCase } from 'internal-test-helpers';

moduleFor(
  'Helpers test: inline {{if}} subexpression laziness',
  class extends RenderingTestCase {
    '@test it does not evaluate a subexpression with only const arguments when the branch is not taken (GH#21030)'(
      assert
    ) {
      let called = 0;

      function sideEffect() {
        called++;
        return 'value';
      }

      let TestComponent = <template>{{if false (sideEffect)}}</template>;

      this.render('<this.TestComponent />', { TestComponent });

      assert.strictEqual(called, 0, 'helper was not evaluated for the untaken branch');
      this.assertText('');
      this.assertStableRerender();
      assert.strictEqual(called, 0, 'helper was not evaluated on rerender');
    }
  }
);
