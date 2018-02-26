import { moduleFor, RenderingTest } from '../../utils/test-case';
import { strip } from '../../utils/abstract-test-case';

moduleFor('{{-with-dynamic-var}}', class extends RenderingTest {
  ['@test does not allow setting values other than outletState'](assert) {
    expectAssertion(() => {
      this.render(strip`
        {{#-with-dynamic-vars foo="bar"}}
          {{-get-dynamic-var 'foo'}}
        {{/-with-dynamic-vars}}
      `);
    }, /Using `-with-dynamic-scope` is only supported for `outletState` \(you used `foo`\)./);
  }

  ['@test allows setting/getting outletState'](assert) {
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

  ['@test does not allow setting values other than outletState'](assert) {
    expectAssertion(() => {
      this.render(`{{-get-dynamic-var 'foo'}}`);
    }, /Using `-get-dynamic-scope` is only supported for `outletState` \(you used `foo`\)./);
  }
});
