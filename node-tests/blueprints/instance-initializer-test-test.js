'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const modifyPackages = blueprintHelpers.modifyPackages;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

const generateFakePackageManifest = require('../helpers/generate-fake-package-manifest');
const fixture = require('../helpers/fixture');

describe('Blueprint: instance-initializer-test', function() {
  setupTestHooks(this);

  describe('in app', function() {
    beforeEach(function() {
      return emberNew();
    });

    it('instance-initializer-test foo', function() {
      return emberGenerateDestroy(['instance-initializer-test', 'foo'], _file => {
        expect(_file('tests/unit/instance-initializers/foo-test.js'))
          .to.equal(fixture('instance-initializer-test/default.js'));
      });
    });

    describe('with ember-cli-qunit@4.1.1', function() {
      beforeEach(function() {
        generateFakePackageManifest('ember-cli-qunit', '4.1.1');
      });

      it('instance-initializer-test foo', function() {
        return emberGenerateDestroy(['instance-initializer-test', 'foo'], _file => {
          expect(_file('tests/unit/instance-initializers/foo-test.js'))
            .to.equal(fixture('instance-initializer-test/rfc232.js'));
        });
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
            .to.equal(fixture('instance-initializer-test/mocha.js'));
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
          .to.equal(fixture('instance-initializer-test/dummy.js'));
      });
    });
  });
});
