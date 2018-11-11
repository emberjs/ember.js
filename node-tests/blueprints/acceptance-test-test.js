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

describe('Blueprint: acceptance-test', function() {
  setupTestHooks(this);

  describe('in app', function() {
    beforeEach(function() {
      return emberNew();
    });

    describe('with ember-cli-qunit@4.1.0', function() {
      beforeEach(function() {
        generateFakePackageManifest('ember-cli-qunit', '4.1.0');
      });

      it('acceptance-test foo', function() {
        return emberGenerateDestroy(['acceptance-test', 'foo'], _file => {
          expect(_file('tests/acceptance/foo-test.js')).to.equal(
            fixture('acceptance-test/default.js')
          );
        });
      });
    });

    describe('with ember-cli-qunit@4.2.0', function() {
      beforeEach(function() {
        generateFakePackageManifest('ember-cli-qunit', '4.2.0');
      });

      it('acceptance-test foo', function() {
        return emberGenerateDestroy(['acceptance-test', 'foo'], _file => {
          expect(_file('tests/acceptance/foo-test.js')).to.equal(
            fixture('acceptance-test/qunit-rfc268.js')
          );
        });
      });
    });

    describe('with ember-cli-mocha', function() {
      beforeEach(function() {
        return modifyPackages([
          { name: 'ember-cli-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true },
        ]);
      });

      it('acceptance-test foo', function() {
        return emberGenerateDestroy(['acceptance-test', 'foo'], _file => {
          expect(_file('tests/acceptance/foo-test.js')).to.equal(
            fixture('acceptance-test/mocha.js')
          );
        });
      });
    });

    describe('with ember-mocha@0.14.0', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-cli-qunit', delete: true },
          { name: 'ember-mocha', dev: true },
        ]);
        generateFakePackageManifest('ember-mocha', '0.14.0');
      });

      it('acceptance-test foo', function() {
        return emberGenerateDestroy(['acceptance-test', 'foo'], _file => {
          expect(_file('tests/acceptance/foo-test.js')).to.equal(
            fixture('acceptance-test/mocha-rfc268.js')
          );
        });
      });
    });
  });

  describe('in addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' });
    });

    describe('with ember-cli-qunit@4.1.0', function() {
      beforeEach(function() {
        generateFakePackageManifest('ember-cli-qunit', '4.1.0');
      });

      it('acceptance-test foo', function() {
        return emberGenerateDestroy(['acceptance-test', 'foo'], _file => {
          expect(_file('tests/acceptance/foo-test.js')).to.equal(
            fixture('acceptance-test/addon-default.js')
          );

          expect(_file('app/acceptance-tests/foo.js')).to.not.exist;
        });
      });

      it('acceptance-test foo/bar', function() {
        return emberGenerateDestroy(['acceptance-test', 'foo/bar'], _file => {
          expect(_file('tests/acceptance/foo/bar-test.js')).to.equal(
            fixture('acceptance-test/addon-nested.js')
          );

          expect(_file('app/acceptance-tests/foo/bar.js')).to.not.exist;
        });
      });
    });

    describe('with ember-cli-qunit@4.2.0', function() {
      beforeEach(function() {
        generateFakePackageManifest('ember-cli-qunit', '4.2.0');
      });

      it('acceptance-test foo', function() {
        return emberGenerateDestroy(['acceptance-test', 'foo'], _file => {
          expect(_file('tests/acceptance/foo-test.js')).to.equal(
            fixture('acceptance-test/qunit-rfc268.js')
          );
        });
      });
    });
  });
});
