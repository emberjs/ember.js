'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

describe('Blueprint: route-addon', function() {
  setupTestHooks(this);

  it('route-addon foo', function() {
    return emberNew({ target: 'addon' }).then(() => emberGenerateDestroy(['route-addon', 'foo'], _file => {
      expect(_file('app/routes/foo.js'))
        .to.contain("export { default } from 'my-addon/routes/foo';");

      expect(_file('app/templates/foo.js'))
        .to.contain("export { default } from 'my-addon/templates/foo';");
    }));
  });
});
