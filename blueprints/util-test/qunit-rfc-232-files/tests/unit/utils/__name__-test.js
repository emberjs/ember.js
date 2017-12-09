import <%= camelizedModuleName %> from '<%= dasherizedModulePrefix %>/utils/<%= dasherizedModuleName %>';
import { module, test } from 'qunit';

module('<%= friendlyTestName %>', function(hooks) {

  // Replace this with your real tests.
  test('it works', function(assert) {
    let result = <%= camelizedModuleName %>();
    assert.ok(result);
  });
});
