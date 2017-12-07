'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

describe('Blueprint: component-addon', function() {
  setupTestHooks(this);

  describe('in addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' });
    });

    it('component-addon foo-bar', function() {
      return emberGenerateDestroy(['component-addon', 'foo-bar'], _file => {
        expect(_file('app/components/foo-bar.js'))
          .to.contain("export { default } from 'my-addon/components/foo-bar';");
      });
    });
  });
});
