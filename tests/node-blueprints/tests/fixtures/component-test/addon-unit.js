import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';

module('Unit | Component | foo', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    let component = this.owner.factoryFor('component:foo').create();
    assert.ok(component);
  });
});
