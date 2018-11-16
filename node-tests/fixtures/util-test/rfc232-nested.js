import fooBarBaz from 'my-app/utils/foo/bar-baz';
import { module, test } from 'qunit';

module('Unit | Utility | foo/bar-baz', function(hooks) {

  // Replace this with your real tests.
  test('it works', function(assert) {
    let result = fooBarBaz();
    assert.ok(result);
  });
});
