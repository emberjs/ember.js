'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const modifyPackages = blueprintHelpers.modifyPackages;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;
const fs = require('fs-extra');

const generateFakePackageManifest = require('../helpers/generate-fake-package-manifest');
const fixture = require('../helpers/fixture');

describe('Blueprint: util-test', function() {
  setupTestHooks(this);

  describe('in app', function() {
    beforeEach(function() {
      return emberNew();
    });

    it('util-test foo-bar', function() {
      return emberGenerateDestroy(['util-test', 'foo-bar'], _file => {
        expect(_file('tests/unit/utils/foo-bar-test.js')).to.equal(fixture('util-test/default.js'));
      });
    });

    describe('with ember-cli-qunit@4.2.0', function() {
      beforeEach(function() {
        generateFakePackageManifest('ember-cli-qunit', '4.2.0');
      });

      it('util-test foo-bar', function() {
        return emberGenerateDestroy(['util-test', 'foo-bar'], _file => {
          expect(_file('tests/unit/utils/foo-bar-test.js')).to.equal(
            fixture('util-test/rfc232.js')
          );
        });
      });
    });

    describe('with ember-cli-mocha', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-cli-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true },
        ]);
      });

      it('util-test foo-bar', function() {
        return emberGenerateDestroy(['util-test', 'foo-bar'], _file => {
          expect(_file('tests/unit/utils/foo-bar-test.js')).to.equal(fixture('util-test/mocha.js'));
        });
      });
    });
  });

  describe('in app - module uninification', function() {
    beforeEach(function() {
      return emberNew().then(() => fs.ensureDirSync('src'));
    });

    it('util-test foo-bar', function() {
      return emberGenerateDestroy(['util-test', 'foo-bar'], _file => {
        expect(_file('src/utils/foo-bar-test.js')).to.equal(fixture('util-test/default.js'));
      });
    });

    describe('with ember-cli-qunit@4.2.0', function() {
      beforeEach(function() {
        generateFakePackageManifest('ember-cli-qunit', '4.2.0');
      });

      it('util-test foo-bar', function() {
        return emberGenerateDestroy(['util-test', 'foo-bar'], _file => {
          expect(_file('src/utils/foo-bar-test.js')).to.equal(fixture('util-test/rfc232.js'));
        });
      });
    });

    describe('with ember-cli-mocha', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-cli-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true },
        ]);
      });

      it('util-test foo-bar', function() {
        return emberGenerateDestroy(['util-test', 'foo-bar'], _file => {
          expect(_file('src/utils/foo-bar-test.js')).to.equal(fixture('util-test/mocha.js'));
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
        expect(_file('tests/unit/utils/foo-bar-test.js')).to.equal(fixture('util-test/dummy.js'));
      });
    });
  });

  describe('in addon - module unification', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' }).then(() => fs.ensureDirSync('src'));
    });

    it('util-test foo-bar', function() {
      return emberGenerateDestroy(['util-test', 'foo-bar'], _file => {
        expect(_file('src/utils/foo-bar-test.js')).to.equal(fixture('util-test/dummy.js'));
      });
    });
  });
});
