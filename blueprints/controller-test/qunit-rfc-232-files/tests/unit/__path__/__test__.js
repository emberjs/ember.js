import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('<%= friendlyTestDescription %>', function(hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function(assert) {
    let controller = this.owner.factoryFor('controller:<%= controllerPathName %>').create();
    assert.ok(controller);
  });
});
