import { moduleFor, RenderingTestCase, strip } from 'internal-test-helpers';

moduleFor(
  '{{-with-dynamic-var}}',
  class extends RenderingTestCase {
    ['@test does not allow setting values other than outletState']() {
      expectAssertion(() => {
        this.render(strip`
        {{#-with-dynamic-vars foo="bar"}}
          {{-get-dynamic-var 'foo'}}
        {{/-with-dynamic-vars}}
      `);
      }, /Using `-with-dynamic-scope` is only supported for `outletState` \(you used `foo`\)./);
    }

    ['@test allows setting/getting outletState']() {
      // this asserts that we can write and read outletState.
      // The value used here is not what is used in real life,
      // so the value being set and asserted can change as needed.
      this.render(strip`
      {{#-with-dynamic-vars outletState="bar"}}
        {{-get-dynamic-var 'outletState'}}
      {{/-with-dynamic-vars}}
    `);

      this.assertText('bar');
    }

    ['@test does not allow getting values other than outletState']() {
      expectAssertion(() => {
        this.render(`{{-get-dynamic-var 'foo'}}`);
      }, /Using `-get-dynamic-scope` is only supported for `outletState` \(you used `foo`\)./);
    }
  }
);
