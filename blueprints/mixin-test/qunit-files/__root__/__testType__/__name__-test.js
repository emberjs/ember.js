import EmberObject from '@ember/object';
import <%= classifiedModuleName %>Mixin from '<%= projectName %>/mixins/<%= dasherizedModuleName %>';
import { module, test } from 'qunit';

module('<%= friendlyTestName %>');

// TODO: Replace this with your real tests.
test('it works', function (assert) {
  let <%= classifiedModuleName %>Object = EmberObject.extend(<%= classifiedModuleName %>Mixin);
  let subject = <%= classifiedModuleName %>Object.create();
  assert.ok(subject);
});
