import fooBar from 'my-app/utils/foo-bar';
import { module, test } from 'qunit';

module('Unit | Utility | foo-bar', function(hooks) {

  // Replace this with your real tests.
  test('it works', function(assert) {
    let result = fooBar();
    assert.ok(result);
  });
});
