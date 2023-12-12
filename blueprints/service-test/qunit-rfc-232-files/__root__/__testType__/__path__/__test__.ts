import { module, test } from 'qunit';
import { setupTest } from '<%= modulePrefix %>/tests/helpers';

module('<%= friendlyTestDescription %>', function (hooks) {
  setupTest(hooks);

  // TODO: Replace this with your real tests.
  test('it exists', function (assert) {
    let service = this.owner.lookup('service:<%= dasherizedModuleName %>');
    assert.ok(service);
  });
});
