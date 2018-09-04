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
const fs = require('fs-extra');

describe('Blueprint: controller-test', function() {
  setupTestHooks(this);

  describe('in app', function() {
    beforeEach(function() {
      return emberNew();
    });

    it('controller-test foo', function() {
      return emberGenerateDestroy(['controller-test', 'foo'], _file => {
        expect(_file('tests/unit/controllers/foo-test.js')).to.equal(
          fixture('controller-test/default.js')
        );
      });
    });

    it('controller-test foo/bar', function() {
      return emberGenerateDestroy(['controller-test', 'foo/bar'], _file => {
        expect(_file('tests/unit/controllers/foo/bar-test.js')).to.equal(
          fixture('controller-test/default-nested.js')
        );
      });
    });

    describe('with ember-cli-qunit@4.2.0', function() {
      beforeEach(function() {
        generateFakePackageManifest('ember-cli-qunit', '4.2.0');
      });

      it('controller-test foo', function() {
        return emberGenerateDestroy(['controller-test', 'foo'], _file => {
          expect(_file('tests/unit/controllers/foo-test.js')).to.equal(
            fixture('controller-test/rfc232.js')
          );
        });
      });

      it('controller-test foo/bar', function() {
        return emberGenerateDestroy(['controller-test', 'foo/bar'], _file => {
          expect(_file('tests/unit/controllers/foo/bar-test.js')).to.equal(
            fixture('controller-test/rfc232-nested.js')
          );
        });
      });
    });

    describe('with ember-cli-mocha@0.11.0', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-cli-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true },
        ]);
        generateFakePackageManifest('ember-cli-mocha', '0.11.0');
      });

      it('controller-test foo for mocha', function() {
        return emberGenerateDestroy(['controller-test', 'foo'], _file => {
          expect(_file('tests/unit/controllers/foo-test.js')).to.equal(
            fixture('controller-test/mocha.js')
          );
        });
      });

      it('controller-test foo/bar for mocha', function() {
        return emberGenerateDestroy(['controller-test', 'foo/bar'], _file => {
          expect(_file('tests/unit/controllers/foo/bar-test.js')).to.equal(
            fixture('controller-test/mocha-nested.js')
          );
        });
      });
    });

    describe('with ember-cli-mocha@0.12.0', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-cli-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true },
        ]);
        generateFakePackageManifest('ember-cli-mocha', '0.12.0');
      });

      it('controller-test foo', function() {
        return emberGenerateDestroy(['controller-test', 'foo'], _file => {
          expect(_file('tests/unit/controllers/foo-test.js')).to.equal(
            fixture('controller-test/mocha-0.12.js')
          );
        });
      });

      it('controller-test foo/bar', function() {
        return emberGenerateDestroy(['controller-test', 'foo/bar'], _file => {
          expect(_file('tests/unit/controllers/foo/bar-test.js')).to.equal(
            fixture('controller-test/mocha-0.12-nested.js')
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

      it('controller-test foo', function() {
        return emberGenerateDestroy(['controller-test', 'foo'], _file => {
          expect(_file('tests/unit/controllers/foo-test.js')).to.equal(
            fixture('controller-test/mocha-rfc232.js')
          );
        });
      });

      it('controller-test foo/bar', function() {
        return emberGenerateDestroy(['controller-test', 'foo/bar'], _file => {
          expect(_file('tests/unit/controllers/foo/bar-test.js')).to.equal(
            fixture('controller-test/mocha-rfc232-nested.js')
          );
        });
      });
    });
  });

  describe('in app - module unification', function() {
    beforeEach(function() {
      return emberNew().then(() => fs.ensureDirSync('src'));
    });

    it('controller-test foo', function() {
      return emberGenerateDestroy(['controller-test', 'foo'], _file => {
        expect(_file('src/ui/routes/foo/controller-test.js')).to.equal(
          fixture('controller-test/default.js')
        );
      });
    });

    it('controller-test foo/bar', function() {
      return emberGenerateDestroy(['controller-test', 'foo/bar'], _file => {
        expect(_file('src/ui/routes/foo/bar/controller-test.js')).to.equal(
          fixture('controller-test/default-nested.js')
        );
      });
    });

    describe('with ember-cli-qunit@4.2.0', function() {
      beforeEach(function() {
        generateFakePackageManifest('ember-cli-qunit', '4.2.0');
      });

      it('controller-test foo', function() {
        return emberGenerateDestroy(['controller-test', 'foo'], _file => {
          expect(_file('src/ui/routes/foo/controller-test.js')).to.equal(
            fixture('controller-test/rfc232.js')
          );
        });
      });

      it('controller-test foo/bar', function() {
        return emberGenerateDestroy(['controller-test', 'foo/bar'], _file => {
          expect(_file('src/ui/routes/foo/bar/controller-test.js')).to.equal(
            fixture('controller-test/rfc232-nested.js')
          );
        });
      });
    });

    describe('with ember-cli-mocha@0.11.0', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-cli-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true },
        ]);
        generateFakePackageManifest('ember-cli-mocha', '0.11.0');
      });

      it('controller-test foo for mocha', function() {
        return emberGenerateDestroy(['controller-test', 'foo'], _file => {
          expect(_file('src/ui/routes/foo/controller-test.js')).to.equal(
            fixture('controller-test/mocha.js')
          );
        });
      });

      it('controller-test foo/bar for mocha', function() {
        return emberGenerateDestroy(['controller-test', 'foo/bar'], _file => {
          expect(_file('src/ui/routes/foo/bar/controller-test.js')).to.equal(
            fixture('controller-test/mocha-nested.js')
          );
        });
      });
    });

    describe('with ember-cli-mocha@0.12.0', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-cli-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true },
        ]);
        generateFakePackageManifest('ember-cli-mocha', '0.12.0');
      });

      it('controller-test foo', function() {
        return emberGenerateDestroy(['controller-test', 'foo'], _file => {
          expect(_file('src/ui/routes/foo/controller-test.js')).to.equal(
            fixture('controller-test/mocha-0.12.js')
          );
        });
      });

      it('controller-test foo/bar', function() {
        return emberGenerateDestroy(['controller-test', 'foo/bar'], _file => {
          expect(_file('src/ui/routes/foo/bar/controller-test.js')).to.equal(
            fixture('controller-test/mocha-0.12-nested.js')
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

      it('controller-test foo', function() {
        return emberGenerateDestroy(['controller-test', 'foo'], _file => {
          expect(_file('src/ui/routes/foo/controller-test.js')).to.equal(
            fixture('controller-test/mocha-rfc232.js')
          );
        });
      });

      it('controller-test foo/bar', function() {
        return emberGenerateDestroy(['controller-test', 'foo/bar'], _file => {
          expect(_file('src/ui/routes/foo/bar/controller-test.js')).to.equal(
            fixture('controller-test/mocha-rfc232-nested.js')
          );
        });
      });
    });
  });

  describe('in addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' });
    });

    it('controller-test foo', function() {
      return emberGenerateDestroy(['controller-test', 'foo'], _file => {
        expect(_file('tests/unit/controllers/foo-test.js')).to.equal(
          fixture('controller-test/default.js')
        );
      });
    });

    it('controller-test foo/bar', function() {
      return emberGenerateDestroy(['controller-test', 'foo/bar'], _file => {
        expect(_file('tests/unit/controllers/foo/bar-test.js')).to.equal(
          fixture('controller-test/default-nested.js')
        );
      });
    });
  });

  describe('in addon - module unification', function() {
    beforeEach(function() {
      return emberNew().then(() => fs.ensureDirSync('src'));
    });

    it('controller-test foo', function() {
      return emberGenerateDestroy(['controller-test', 'foo'], _file => {
        expect(_file('src/ui/routes/foo/controller-test.js')).to.equal(
          fixture('controller-test/default.js')
        );
      });
    });

    it('controller-test foo/bar', function() {
      return emberGenerateDestroy(['controller-test', 'foo/bar'], _file => {
        expect(_file('src/ui/routes/foo/bar/controller-test.js')).to.equal(
          fixture('controller-test/default-nested.js')
        );
      });
    });
  });
});
