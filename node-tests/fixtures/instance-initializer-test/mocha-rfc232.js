import { expect } from 'chai';
import { describe, it, beforeEach, afterEach } from 'mocha';
import Application from '@ember/application';
import { initialize } from 'my-app/instance-initializers/foo';
import { run } from '@ember/runloop';

describe('Unit | Instance Initializer | foo', function() {
  beforeEach(function() {
    this.TestApplication = Application.extend();
    this.TestApplication.instanceInitializer({
      name: 'initializer under test',
      initialize
    });
    this.application = this.TestApplication.create({ autoboot: false });
    this.instance = this.application.buildInstance();
  });
  afterEach(function() {
    run(this.instance, 'destroy');
    run(this.application, 'destroy');
  });

  // Replace this with your real tests.
  it('works', async function() {
    await this.instance.boot();

    expect(true).to.be.ok;
  });
});
