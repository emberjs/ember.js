import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Component | x-foo', function(hooks) {
  setupTest(hooks);

  test('it exists', function(assert) {
    let component = this.owner.factoryFor('component:x-foo').create();
    assert.ok(component);
  });
});
