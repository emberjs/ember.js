import Ember from 'ember';
import { initialize } from '<%= dependencyDepth %>/instance-initializers/<%= dasherizedModuleName %>';
import { module, test } from 'qunit';
import destroyApp from '../../helpers/destroy-app';

module('<%= friendlyTestName %>', {
  beforeEach: function() {
    Ember.run(() => {
      this.application = Ember.Application.create();
      this.appInstance = this.application.buildInstance();
    });
  },
  afterEach: function() {
    Ember.run(this.appInstance, 'destroy');
    destroyApp(this.application);
  }
});

// Replace this with your real tests.
test('it works', function(assert) {
  initialize(this.appInstance);

  // you would normally confirm the results of the initializer here
  assert.ok(true);
});
