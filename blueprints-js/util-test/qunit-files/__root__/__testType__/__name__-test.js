import <%= camelizedModuleName %> from '<%= modulePrefix %>/utils/<%= dasherizedModuleName %>';
import { module, test } from 'qunit';

module('<%= friendlyTestName %>');

// TODO: Replace this with your real tests.
test('it works', function (assert) {
  let result = <%= camelizedModuleName %>();
  assert.ok(result);
});
