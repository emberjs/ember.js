import Application from '@ember/application';
import { run } from '@ember/runloop';
import { initialize } from 'dummy/init/instance-initializers/foo';
import { module, test } from 'qunit';

module('Unit | Instance Initializer | foo', {
  beforeEach() {
    run(() => {
      this.application = Application.create();
      this.appInstance = this.application.buildInstance();
    });
  },
  afterEach() {
    run(this.appInstance, 'destroy');
    run(this.application, 'destroy');
  }
});

// Replace this with your real tests.
test('it works', function(assert) {
  initialize(this.appInstance);

  // you would normally confirm the results of the initializer here
  assert.ok(true);
});
