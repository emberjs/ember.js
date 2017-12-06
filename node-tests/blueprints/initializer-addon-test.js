'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

describe('Acceptance: ember generate and destroy initializer-addon', function() {
  setupTestHooks(this);

  it('initializer-addon foo', function() {
    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(['initializer-addon', 'foo'], _file => {
        expect(_file('app/initializers/foo.js'))
          .to.contain("export { default, initialize } from 'my-addon/initializers/foo';");
      }));
  });
});
