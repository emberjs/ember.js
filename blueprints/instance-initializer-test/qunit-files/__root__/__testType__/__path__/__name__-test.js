import Application from '@ember/application';
import { run } from '@ember/runloop';
import { initialize } from '<%= modulePrefix %>/instance-initializers/<%= dasherizedModuleName %>';
import { module, test } from 'qunit';<% if (destroyAppExists) { %>
import destroyApp from '../../helpers/destroy-app';<% } %>

module('<%= friendlyTestName %>', {
  beforeEach() {
    run(() => {
      this.application = Application.create();
      this.appInstance = this.application.buildInstance();
    });
  },
  afterEach() {
    run(this.appInstance, 'destroy');
    <% if (destroyAppExists) { %>destroyApp(this.application);<% } else { %>run(this.application, 'destroy');<% } %>
  }
});

// Replace this with your real tests.
test('it works', function(assert) {
  initialize(this.appInstance);

  // you would normally confirm the results of the initializer here
  assert.ok(true);
});
