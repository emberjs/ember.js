import { module, test } from 'qunit';
import { setupTest } from 'my-app/tests/helpers';

module('Unit | Component | x-foo', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    let component = this.owner.factoryFor('component:x-foo').create();
    assert.ok(component);
  });
});
