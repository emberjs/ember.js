import Application from '@ember/application';
import { run } from '@ember/runloop';

import { initialize } from '<%= modulePrefix %>/initializers/<%= dasherizedModuleName %>';
import { module, test } from 'qunit';
<% if (destroyAppExists) { %>import destroyApp from '../../helpers/destroy-app';\n<% } %>
module('<%= friendlyTestName %>', {
  beforeEach() {
    run(() => {
      this.application = Application.create();
      this.application.deferReadiness();
    });
  },
  afterEach() {
    <% if (destroyAppExists) { %>destroyApp(this.application);<% } else { %>run(this.application, 'destroy');<% } %>
  },
});

// TODO: Replace this with your real tests.
test('it works', function (assert) {
  initialize(this.application);

  // you would normally confirm the results of the initializer here
  assert.ok(true);
});
