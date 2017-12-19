import { moduleFor, RenderingTest } from '../../utils/test-case';
import { strip } from '../../utils/abstract-test-case';
import { RouteInfo } from 'ember-routing';

moduleFor('{{-with-dynamic-var}}', class extends RenderingTest {
  ['@test does not allow setting values other than outletState']() {
    expectAssertion(() => {
      this.render(strip`
        {{#-with-dynamic-vars foo="bar"}}
          {{-get-dynamic-var 'foo'}}
        {{/-with-dynamic-vars}}
      `);
    }, /Using `-with-dynamic-scope` is only supported for `outletState` \(you used `foo`\)./);
  }

  ['@test allows setting/getting outletState'](assert) {
    assert.expect(1);

    let myOutletState = new RouteInfo("some-route");

    this.registerHelper('my-inspect-helper', function([outletState]) {
      assert.equal(outletState, myOutletState, 'expected to receive outletState');
    });

    this.render(strip`
      {{#-with-dynamic-vars outletState=myOutletState}}
        {{my-inspect-helper (-get-dynamic-var 'outletState')}}
      {{/-with-dynamic-vars}}
    `, { myOutletState });
  }

  ['@test does not allow getting values other than outletState']() {
    expectAssertion(() => {
      this.render(`{{-get-dynamic-var 'foo'}}`);
    }, /Using `-get-dynamic-scope` is only supported for `outletState` \(you used `foo`\)./);
  }
});
