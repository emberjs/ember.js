import { module, test } from 'qunit';
import { setupTest } from '<%= modulePrefix %>/tests/helpers';

module('<%= friendlyTestDescription %>', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    let route = this.owner.lookup('route:<%= moduleName %>');
    assert.ok(route);
  });
});
