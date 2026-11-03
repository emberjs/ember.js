import { moduleFor, RenderingTestCase, strip } from 'internal-test-helpers';
import { ClassicRenderingTestCase } from '../../utils/classic-rendering-test-case';

moduleFor(
  '{{-with-dynamic-var}}',
  class extends RenderingTestCase {
    ['@test allows setting/getting outletState']() {
      // this is simply asserting that we can write and read outletState
      // the actual value being used here is not what is used in real life
      // feel free to change the value being set and asserted as needed
      this.render(strip`
      {{#-with-dynamic-vars outletState="bar"}}
        {{-get-dynamic-var 'outletState'}}
      {{/-with-dynamic-vars}}
    `);

      this.assertText('bar');
    }
  }
);

moduleFor(
  '{{-with-dynamic-var}} (classic root)',
  class extends ClassicRenderingTestCase {
    ['@test does not allow setting values other than outletState']() {
      expectAssertion(() => {
        this.render(strip`
        {{#-with-dynamic-vars foo="bar"}}
          {{-get-dynamic-var 'foo'}}
        {{/-with-dynamic-vars}}
      `);
      }, /Using `-with-dynamic-scope` is only supported for `outletState` \(you used `foo`\)./);
    }

    ['@test does not allow getting values other than outletState']() {
      expectAssertion(() => {
        this.render(`{{-get-dynamic-var 'foo'}}`);
      }, /Using `-get-dynamic-scope` is only supported for `outletState` \(you used `foo`\)./);
    }
  }
);
