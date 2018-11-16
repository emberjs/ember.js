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

describe('Blueprint: mixin-test', function() {
  setupTestHooks(this);

  describe('in app', function() {
    beforeEach(function() {
      return emberNew();
    });

    it('mixin-test foo', function() {
      return emberGenerateDestroy(['mixin-test', 'foo'], _file => {
        expect(_file('tests/unit/mixins/foo-test.js')).to.equal(fixture('mixin-test/rfc232.js'));
      });
    });

    describe('with ember-cli-mocha', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true },
        ]);
      });

      it('mixin-test foo', function() {
        return emberGenerateDestroy(['mixin-test', 'foo'], _file => {
          expect(_file('tests/unit/mixins/foo-test.js')).to.equal(fixture('mixin-test/mocha.js'));
        });
      });
    });

    describe('with ember-cli-qunit@4.2.0', function() {
      beforeEach(function() {
        generateFakePackageManifest('ember-qunit', '4.2.0');
      });

      it('mixin-test foo', function() {
        return emberGenerateDestroy(['mixin-test', 'foo'], _file => {
          expect(_file('tests/unit/mixins/foo-test.js')).to.equal(fixture('mixin-test/rfc232.js'));
        });
      });
    });

    describe('with ember-mocha@0.14.0', function() {
      beforeEach(function() {
        modifyPackages([{ name: 'ember-qunit', delete: true }, { name: 'ember-mocha', dev: true }]);
        generateFakePackageManifest('ember-mocha', '0.14.0');
      });

      it('mixin-test foo', function() {
        return emberGenerateDestroy(['mixin-test', 'foo'], _file => {
          expect(_file('tests/unit/mixins/foo-test.js')).to.equal(
            fixture('mixin-test/mocha-rfc232.js')
          );
        });
      });
    });
  });

  describe('in app - module unification', function() {
    beforeEach(function() {
      return emberNew({ isModuleUnification: true });
    });

    it('mixin-test foo', function() {
      return emberGenerateDestroy(
        ['mixin-test', 'foo'],
        _file => {
          expect(_file('src/mixins/foo-test.js')).to.equal(fixture('mixin-test/rfc232.js'));
        },
        { isModuleUnification: true }
      );
    });

    describe('with ember-cli-mocha', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true },
        ]);
      });

      it('mixin-test foo', function() {
        return emberGenerateDestroy(
          ['mixin-test', 'foo'],
          _file => {
            expect(_file('src/mixins/foo-test.js')).to.equal(fixture('mixin-test/mocha.js'));
          },
          { isModuleUnification: true }
        );
      });
    });

    describe('with ember-cli-qunit@4.2.0', function() {
      beforeEach(function() {
        generateFakePackageManifest('ember-cli-qunit', '4.2.0');
      });

      it('mixin-test foo', function() {
        return emberGenerateDestroy(
          ['mixin-test', 'foo'],
          _file => {
            expect(_file('src/mixins/foo-test.js')).to.equal(fixture('mixin-test/rfc232.js'));
          },
          { isModuleUnification: true }
        );
      });
    });
  });

  describe('in addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' });
    });

    it('mixin-test foo', function() {
      return emberGenerateDestroy(['mixin-test', 'foo'], _file => {
        expect(_file('tests/unit/mixins/foo-test.js')).to.equal(fixture('mixin-test/addon.js'));
      });
    });
  });

  describe('in addon - module unification', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon', isModuleUnification: true });
    });

    it('mixin-test foo', function() {
      return emberGenerateDestroy(
        ['mixin-test', 'foo'],
        _file => {
          expect(_file('src/mixins/foo-test.js')).to.equal(fixture('mixin-test/addon.js'));
        },
        { isModuleUnification: true }
      );
    });
  });

  describe('in in-repo-addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'in-repo-addon' });
    });

    it('mixin-test foo --in-repo-addon=my-addon', function() {
      return emberGenerateDestroy(['mixin-test', 'foo', '--in-repo-addon=my-addon'], _file => {
        expect(_file('tests/unit/mixins/foo-test.js')).to.equal(fixture('mixin-test/addon.js'));
      });
    });
  });
});
