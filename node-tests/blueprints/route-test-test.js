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

describe('Blueprint: route-test', function() {
  setupTestHooks(this);

  describe('in app', function() {
    beforeEach(function() {
      return emberNew();
    });

    it('route-test foo', function() {
      return emberGenerateDestroy(['route-test', 'foo'], (_file) => {
        expect(_file('tests/unit/routes/foo-test.js'))
          .to.equal(fixture('route-test/default.js'));
      });
    });

    describe('with ember-cli-mocha@0.11.0', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-cli-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true }
        ]);
        generateFakePackageManifest('ember-cli-mocha', '0.11.0');
      });

      it('route-test foo', function() {
        return emberGenerateDestroy(['route-test', 'foo'], (_file) => {
          expect(_file('tests/unit/routes/foo-test.js'))
            .to.equal(fixture('route-test/mocha.js'));
        });
      });
    });

    describe('with ember-cli-mocha@0.12.0', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-cli-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true }
        ]);
        generateFakePackageManifest('ember-cli-mocha', '0.12.0');
      });

      it('route-test foo', function() {
        return emberGenerateDestroy(['route-test', 'foo'], (_file) => {
          expect(_file('tests/unit/routes/foo-test.js'))
            .to.equal(fixture('route-test/mocha-0.12.js'));
        });
      });
    });
  });

  describe('in addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' });
    });

    it('route-test foo', function() {
      return emberGenerateDestroy(['route-test', 'foo'], (_file) => {
        expect(_file('tests/unit/routes/foo-test.js'))
          .to.equal(fixture('route-test/default.js'));
      });
    });
  });
});
