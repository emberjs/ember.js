import { expect } from 'chai';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { run } from '@ember/runloop';
import Application from '@ember/application';
import { initialize } from 'my-app/init/initializers/foo';


describe('Unit | Initializer | foo', function() {
  let application;

  beforeEach(function() {
    run(function() {
      application = Application.create();
      application.deferReadiness();
    });
  });

  afterEach(function() {
    run(application, 'destroy');
  });

  // Replace this with your real tests.
  it('works', function() {
    initialize(application);

    // you would normally confirm the results of the initializer here
    expect(true).to.be.ok;
  });
});
