import { expect } from 'chai';
import { describe, it, afterEach, beforeEach } from 'mocha';
import Application from '@ember/application';
import { run } from '@ember/runloop';
import { initialize } from '<%= modulePrefix %>/instance-initializers/<%= dasherizedModuleName %>';
import destroyApp from '../../helpers/destroy-app';

describe('<%= friendlyTestName %>', function() {
  let application, appInstance;

  beforeEach(function() {
    run(function() {
      application = Application.create();
      appInstance = application.buildInstance();
    });
  });

  afterEach(function() {
    run(appInstance, 'destroy');
    destroyApp(application);
  });

  // Replace this with your real tests.
  it('works', function() {
    initialize(appInstance);

    // you would normally confirm the results of the initializer here
    expect(true).to.be.ok;
  });
});
