'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const modifyPackages = blueprintHelpers.modifyPackages;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

describe('Blueprint: initializer-test', function() {
  setupTestHooks(this);

  describe('in app', function() {
    beforeEach(function() {
      return emberNew();
    });

    it('initializer-test foo', function() {
      return emberGenerateDestroy(['initializer-test', 'foo'], _file => {
        expect(_file('tests/unit/initializers/foo-test.js'))
          .to.contain("import { initialize } from 'my-app/initializers/foo';")
          .to.contain("module('Unit | Initializer | foo'")
          .to.contain("application = Application.create();")
          .to.contain("initialize(this.application);");
      });
    });

    describe('with ember-cli-mocha', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-cli-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true }
        ]);
      });

      it('initializer-test foo', function() {
        return emberGenerateDestroy(['initializer-test', 'foo'], _file => {
          expect(_file('tests/unit/initializers/foo-test.js'))
            .to.contain("import { initialize } from 'my-app/initializers/foo';")
            .to.contain("describe('Unit | Initializer | foo', function() {")
            .to.contain("application = Application.create();")
            .to.contain("initialize(application);");
        });
      });
    });
  });

  describe('in addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' });
    });

    it('initializer-test foo', function() {
      return emberGenerateDestroy(['initializer-test', 'foo'], _file => {
        expect(_file('tests/unit/initializers/foo-test.js'))
          .to.contain("import { initialize } from 'dummy/initializers/foo';")
          .to.contain("module('Unit | Initializer | foo'")
          .to.contain("application = Application.create();")
          .to.contain("initialize(this.application);");
      });
    });
  });
});
