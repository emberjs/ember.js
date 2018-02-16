import { fooBarBaz } from 'my-app/helpers/foo/bar-baz';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Helper | foo/bar-baz', function(hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it works', function(assert) {
    let result = fooBarBaz([42]);
    assert.ok(result);
  });
});
