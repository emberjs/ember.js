'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const modifyPackages = blueprintHelpers.modifyPackages;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

describe('Blueprint: util-test', function() {
  setupTestHooks(this);

  describe('in app', function() {
    beforeEach(function() {
      return emberNew();
    });

    it('util-test foo-bar', function() {
      return emberGenerateDestroy(['util-test', 'foo-bar'], _file => {
        expect(_file('tests/unit/utils/foo-bar-test.js'))
          .to.contain("import fooBar from 'my-app/utils/foo-bar';");
      });
    });

    describe('with ember-cli-mocha', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-cli-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true }
        ]);
      });

      it('util-test foo-bar', function() {
        return emberGenerateDestroy(['util-test', 'foo-bar'], _file => {
          expect(_file('tests/unit/utils/foo-bar-test.js'))
            .to.contain("import { describe, it } from 'mocha';")
            .to.contain("import fooBar from 'my-app/utils/foo-bar';")
            .to.contain("describe('Unit | Utility | foo bar', function() {");
        });
      });
    });
  });

  describe('in addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' });
    });

    it('util-test foo-bar', function() {
      return emberGenerateDestroy(['util-test', 'foo-bar'], _file => {
        expect(_file('tests/unit/utils/foo-bar-test.js'))
          .to.contain("import fooBar from 'dummy/utils/foo-bar';");
      });
    });
  });
});
