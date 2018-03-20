'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

describe('Blueprint: instance-initializer-addon', function() {
  setupTestHooks(this);

  describe('in addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' });
    });

    it('instance-initializer-addon foo', function() {
      return emberGenerateDestroy(['instance-initializer-addon', 'foo'], _file => {
        expect(_file('app/instance-initializers/foo.js'))
          .to.contain("export { default, initialize } from 'my-addon/instance-initializers/foo';");
      });
    });

    it('instance-initializer-addon foo --pod', function() {
      return emberGenerateDestroy(['instance-initializer-addon', 'foo', '--pod'], _file => {
        expect(_file('app/instance-initializers/foo.js'))
          .to.contain("export { default, initialize } from 'my-addon/instance-initializers/foo';");
      });
    });
  });
});
