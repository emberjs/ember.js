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

describe('Blueprint: initializer-test', function() {
  setupTestHooks(this);

  describe('in app', function() {
    beforeEach(function() {
      return emberNew();
    });

    describe('with ember-cli-qunit@4.1.0', function() {
      beforeEach(function() {
        generateFakePackageManifest('ember-cli-qunit', '4.1.0');
      });

      it('initializer-test foo', function() {
        return emberGenerateDestroy(['initializer-test', 'foo'], _file => {
          expect(_file('tests/unit/initializers/foo-test.js')).to.equal(
            fixture('initializer-test/default.js')
          );
        });
      });
    });

    describe('with ember-cli-qunit@4.2.0', function() {
      beforeEach(function() {
        generateFakePackageManifest('ember-cli-qunit', '4.2.0');
      });

      it('initializer-test foo', function() {
        return emberGenerateDestroy(['initializer-test', 'foo'], _file => {
          expect(_file('tests/unit/initializers/foo-test.js')).to.equal(
            fixture('initializer-test/rfc232.js')
          );
        });
      });
    });

    describe('with ember-cli-mocha', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true },
        ]);
      });

      it('initializer-test foo', function() {
        return emberGenerateDestroy(['initializer-test', 'foo'], _file => {
          expect(_file('tests/unit/initializers/foo-test.js')).to.equal(
            fixture('initializer-test/mocha.js')
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

      it('initializer-test foo', function() {
        return emberGenerateDestroy(['initializer-test', 'foo'], _file => {
          expect(_file('tests/unit/initializers/foo-test.js')).to.equal(
            fixture('initializer-test/dummy.js')
          );
        });
      });
    });
  });

  describe('in app – module unification', function() {
    beforeEach(function() {
      return emberNew().then(() => fs.ensureDirSync('src'));
    });

    describe('with ember-cli-qunit@4.1.0', function() {
      beforeEach(function() {
        generateFakePackageManifest('ember-cli-qunit', '4.1.0');
      });

      it('initializer-test foo', function() {
        return emberGenerateDestroy(['initializer-test', 'foo'], _file => {
          expect(_file('src/init/initializers/foo-test.js')).to.equal(
            fixture('initializer-test/module-unification/default.js')
          );
        });
      });
    });

    describe('with ember-cli-qunit@4.2.0', function() {
      beforeEach(function() {
        generateFakePackageManifest('ember-cli-qunit', '4.2.0');
      });

      it('initializer-test foo', function() {
        return emberGenerateDestroy(['initializer-test', 'foo'], _file => {
          expect(_file('src/init/initializers/foo-test.js')).to.equal(
            fixture('initializer-test/module-unification/rfc232.js')
          );
        });
      });
    });

    describe('with ember-cli-mocha', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true },
        ]);
      });

      it('initializer-test foo', function() {
        return emberGenerateDestroy(['initializer-test', 'foo'], _file => {
          expect(_file('src/init/initializers/foo-test.js')).to.equal(
            fixture('initializer-test/module-unification/mocha.js')
          );
        });
      });
    });
  });

  describe('in addon - module unification', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' }).then(() => fs.ensureDirSync('src'));
    });

    describe('with ember-cli-qunit@4.1.0', function() {
      beforeEach(function() {
        generateFakePackageManifest('ember-cli-qunit', '4.1.0');
      });

      it('initializer-test foo', function() {
        return emberGenerateDestroy(['initializer-test', 'foo'], _file => {
          expect(_file('src/init/initializers/foo-test.js')).to.equal(
            fixture('initializer-test/module-unification/dummy.js')
          );
        });
      });

      it('initializer-test foo --dummy', function() {
        return emberGenerateDestroy(['initializer-test', 'foo', '--dummy'], _file => {
          expect(_file('tests/dummy/src/init/initializers/foo-test.js')).to.equal(
            fixture('initializer-test/module-unification/dummy.js')
          );
        });
      });
    });
  });
});
