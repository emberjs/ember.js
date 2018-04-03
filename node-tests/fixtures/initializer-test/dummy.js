import Application from '@ember/application';

import { initialize } from 'dummy/initializers/foo';
import { module, test } from 'qunit';
import { run } from '@ember/runloop';

module('Unit | Initializer | foo', {
  beforeEach() {
    run(() => {
      this.application = Application.create();
      this.application.deferReadiness();
    });
  },
  afterEach() {
    run(this.application, 'destroy');
  }
});

// Replace this with your real tests.
test('it works', function(assert) {
  initialize(this.application);

  // you would normally confirm the results of the initializer here
  assert.ok(true);
});
