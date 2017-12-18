import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import startApp from 'my-app/tests/helpers/start-app';
import destroyApp from 'my-app/tests/helpers/destroy-app';

describe('Acceptance | foo', function() {
  let application;

  beforeEach(function() {
    application = startApp();
  });

  afterEach(function() {
    destroyApp(application);
  });

  it('can visit /foo', function() {
    visit('/foo');

    return andThen(() => {
      expect(currentURL()).to.equal('/foo');
    });
  });
});
