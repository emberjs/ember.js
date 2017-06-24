import Ember from 'ember';
const { Object } = Ember;
import <%= classifiedModuleName %>Mixin from '<%= projectName %>/mixins/<%= dasherizedModuleName %>';
import { module, test } from 'qunit';

module('<%= friendlyTestName %>');

// Replace this with your real tests.
test('it works', function(assert) {
  let <%= classifiedModuleName %>Object = Object.extend(<%= classifiedModuleName %>Mixin);
  let subject = <%= classifiedModuleName %>Object.create();
  assert.ok(subject);
});
