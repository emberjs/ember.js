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

describe('Blueprint: service-test', function () {
  setupTestHooks(this);

  describe('in app', function () {
    beforeEach(function () {
      return emberNew();
    });

    describe('with ember-cli-qunit@4.1.0', function () {
      beforeEach(function () {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-qunit', dev: true },
        ]);
        generateFakePackageManifest('ember-cli-qunit', '4.1.0');
      });

      it('service-test foo', function () {
        return emberGenerateDestroy(['service-test', 'foo'], (_file) => {
          expect(_file('tests/unit/services/foo-test.js')).to.equal(
            fixture('service-test/default.js')
          );
        });
      });
    });

    describe('with ember-cli-qunit@4.2.0', function () {
      beforeEach(function () {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-qunit', dev: true },
        ]);
        generateFakePackageManifest('ember-cli-qunit', '4.2.0');
      });

      it('service-test foo', function () {
        return emberGenerateDestroy(['service-test', 'foo'], (_file) => {
          expect(_file('tests/unit/services/foo-test.js')).to.equal(
            fixture('service-test/rfc232.js')
          );
        });
      });
    });
  });

  describe('in addon', function () {
    beforeEach(function () {
      return emberNew({ target: 'addon' });
    });

    describe('with ember-cli-qunit@4.1.0', function () {
      beforeEach(function () {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-qunit', dev: true },
        ]);
        generateFakePackageManifest('ember-cli-qunit', '4.1.0');
      });

      it('service-test foo', function () {
        return emberGenerateDestroy(['service-test', 'foo'], (_file) => {
          expect(_file('tests/unit/services/foo-test.js')).to.equal(
            fixture('service-test/default.js')
          );

          expect(_file('app/service-test/foo.js')).to.not.exist;
        });
      });
    });

    describe('with ember-qunit (default)', function () {
      it('service-test foo', function () {
        return emberGenerateDestroy(['service-test', 'foo'], (_file) => {
          expect(_file('tests/unit/services/foo-test.js')).to.equal(
            fixture('service-test/rfc232-addon.js')
          );
        });
      });
    });
  });
});
