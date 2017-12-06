'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

describe('Acceptance: ember generate and destroy component-addon', function() {
  setupTestHooks(this);

  it('component-addon foo-bar', function() {
    let args = ['component-addon', 'foo-bar'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/components/foo-bar.js'))
          .to.contain("export { default } from 'my-addon/components/foo-bar';");
      }));
  });
});
