'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const modifyPackages = blueprintHelpers.modifyPackages;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

describe('Blueprint: instance-initializer-test', function() {
  setupTestHooks(this);

  describe('in app', function() {
    beforeEach(function() {
      return emberNew();
    });

    it('instance-initializer-test foo', function() {
      return emberGenerateDestroy(['instance-initializer-test', 'foo'], _file => {
        expect(_file('tests/unit/instance-initializers/foo-test.js'))
          .to.contain("import { initialize } from 'my-app/instance-initializers/foo';")
          .to.contain("module('Unit | Instance Initializer | foo'")
          .to.contain("application = Application.create();")
          .to.contain("this.appInstance = this.application.buildInstance();")
          .to.contain("initialize(this.appInstance);");
      });
    });

    describe('with ember-cli-mocha', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-cli-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true }
        ]);
      });

      it('instance-initializer-test foo for mocha', function() {
        return emberGenerateDestroy(['instance-initializer-test', 'foo'], _file => {
          expect(_file('tests/unit/instance-initializers/foo-test.js'))
            .to.contain("import { initialize } from 'my-app/instance-initializers/foo';")
            .to.contain("describe('Unit | Instance Initializer | foo', function() {")
            .to.contain("application = Application.create();")
            .to.contain("appInstance = application.buildInstance();")
            .to.contain("initialize(appInstance);");
        });
      });
    });
  });

  describe('in addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' });
    });

    it('instance-initializer-test foo', function() {
      return emberGenerateDestroy(['instance-initializer-test', 'foo'], _file => {
        expect(_file('tests/unit/instance-initializers/foo-test.js'))
          .to.contain("import { initialize } from 'dummy/instance-initializers/foo';")
          .to.contain("module('Unit | Instance Initializer | foo'")
          .to.contain("application = Application.create();")
          .to.contain("this.appInstance = this.application.buildInstance();")
          .to.contain("initialize(this.appInstance);");
      });
    });
  });
});
