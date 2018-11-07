'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const setupPodConfig = blueprintHelpers.setupPodConfig;

const expectError = require('../helpers/expect-error');
const chai = require('ember-cli-blueprint-test-helpers/chai');
const fs = require('fs-extra');
const expect = chai.expect;

const generateFakePackageManifest = require('../helpers/generate-fake-package-manifest');
const fixture = require('../helpers/fixture');

describe('Blueprint: controller', function() {
  setupTestHooks(this);

  describe('in app', function() {
    beforeEach(function() {
      return emberNew().then(() => generateFakePackageManifest('ember-cli-qunit', '4.1.0'));
    });

    it('controller foo', function() {
      return emberGenerateDestroy(['controller', 'foo'], _file => {
        expect(_file('app/controllers/foo.js')).to.equal(fixture('controller/controller.js'));

        expect(_file('tests/unit/controllers/foo-test.js')).to.equal(
          fixture('controller-test/default.js')
        );
      });
    });

    it('controller foo/bar', function() {
      return emberGenerateDestroy(['controller', 'foo/bar'], _file => {
        expect(_file('app/controllers/foo/bar.js')).to.equal(
          fixture('controller/controller-nested.js')
        );

        expect(_file('tests/unit/controllers/foo/bar-test.js')).to.equal(
          fixture('controller-test/default-nested.js')
        );
      });
    });

    it('controller foo --pod', function() {
      return emberGenerateDestroy(['controller', 'foo', '--pod'], _file => {
        expect(_file('app/foo/controller.js')).to.equal(fixture('controller/controller.js'));

        expect(_file('tests/unit/foo/controller-test.js')).to.equal(
          fixture('controller-test/default.js')
        );
      });
    });

    it('controller foo/bar --pod', function() {
      return emberGenerateDestroy(['controller', 'foo/bar', '--pod'], _file => {
        expect(_file('app/foo/bar/controller.js')).to.equal(
          fixture('controller/controller-nested.js')
        );

        expect(_file('tests/unit/foo/bar/controller-test.js')).to.equal(
          fixture('controller-test/default-nested.js')
        );
      });
    });

    describe('with podModulePrefix', function() {
      beforeEach(function() {
        setupPodConfig({ podModulePrefix: true });
      });

      it('controller foo --pod podModulePrefix', function() {
        return emberGenerateDestroy(['controller', 'foo', '--pod'], _file => {
          expect(_file('app/pods/foo/controller.js')).to.equal(fixture('controller/controller.js'));

          expect(_file('tests/unit/pods/foo/controller-test.js')).to.equal(
            fixture('controller-test/default.js')
          );
        });
      });

      it('controller foo/bar --pod podModulePrefix', function() {
        return emberGenerateDestroy(['controller', 'foo/bar', '--pod'], _file => {
          expect(_file('app/pods/foo/bar/controller.js')).to.equal(
            fixture('controller/controller-nested.js')
          );

          expect(_file('tests/unit/pods/foo/bar/controller-test.js')).to.equal(
            fixture('controller-test/default-nested.js')
          );
        });
      });
    });
  });

  describe('in addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' }).then(() =>
        generateFakePackageManifest('ember-cli-qunit', '4.1.0')
      );
    });

    it('controller foo', function() {
      return emberGenerateDestroy(['controller', 'foo'], _file => {
        expect(_file('addon/controllers/foo.js')).to.equal(fixture('controller/controller.js'));

        expect(_file('app/controllers/foo.js')).to.contain(
          "export { default } from 'my-addon/controllers/foo';"
        );

        expect(_file('tests/unit/controllers/foo-test.js')).to.equal(
          fixture('controller-test/default.js')
        );
      });
    });

    it('controller foo/bar', function() {
      return emberGenerateDestroy(['controller', 'foo/bar'], _file => {
        expect(_file('addon/controllers/foo/bar.js')).to.equal(
          fixture('controller/controller-nested.js')
        );

        expect(_file('app/controllers/foo/bar.js')).to.contain(
          "export { default } from 'my-addon/controllers/foo/bar';"
        );

        expect(_file('tests/unit/controllers/foo/bar-test.js')).to.equal(
          fixture('controller-test/default-nested.js')
        );
      });
    });

    it('controller foo --dummy', function() {
      return emberGenerateDestroy(['controller', 'foo', '--dummy'], _file => {
        expect(_file('tests/dummy/app/controllers/foo.js')).to.equal(
          fixture('controller/controller.js')
        );

        expect(_file('app/controllers/foo-test.js')).to.not.exist;

        expect(_file('tests/unit/controllers/foo-test.js')).to.not.exist;
      });
    });

    it('controller foo/bar --dummy', function() {
      return emberGenerateDestroy(['controller', 'foo/bar', '--dummy'], _file => {
        expect(_file('tests/dummy/app/controllers/foo/bar.js')).to.equal(
          fixture('controller/controller-nested.js')
        );

        expect(_file('app/controllers/foo/bar.js')).to.not.exist;

        expect(_file('tests/unit/controllers/foo/bar-test.js')).to.not.exist;
      });
    });
  });

  describe('in app - module unification', function() {
    beforeEach(function() {
      return emberNew()
        .then(() => fs.ensureDirSync('src'))
        .then(() => generateFakePackageManifest('ember-cli-qunit', '4.1.0'));
    });

    it('controller foo', function() {
      return emberGenerateDestroy(['controller', 'foo'], _file => {
        expect(_file('src/ui/routes/foo/controller.js')).to.equal(
          fixture('controller/controller.js')
        );

        expect(_file('src/ui/routes/foo/controller-test.js')).to.equal(
          fixture('controller-test/default.js')
        );
      });
    });

    it('controller foo/bar', function() {
      return emberGenerateDestroy(['controller', 'foo/bar'], _file => {
        expect(_file('src/ui/routes/foo/bar/controller.js')).to.equal(
          fixture('controller/controller-nested.js')
        );

        expect(_file('src/ui/routes/foo/bar/controller-test.js')).to.equal(
          fixture('controller-test/default-nested.js')
        );
      });
    });

    describe('with podModulePrefix', function() {
      beforeEach(function() {
        setupPodConfig({ podModulePrefix: true });
      });

      it('controller foo --pod podModulePrefix', function() {
        return expectError(
          emberGenerateDestroy(['controller', 'foo', '--pod']),
          "Pods aren't supported within a module unification app"
        );
      });
    });
  });

  describe('in addon - module unification', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' })
        .then(() => fs.ensureDirSync('src'))
        .then(() => generateFakePackageManifest('ember-cli-qunit', '4.1.0'));
    });

    it('controller foo', function() {
      return emberGenerateDestroy(['controller', 'foo'], _file => {
        expect(_file('src/ui/routes/foo/controller.js')).to.equal(
          fixture('controller/controller.js')
        );

        expect(_file('src/ui/routes/foo/controller-test.js')).to.equal(
          fixture('controller-test/default.js')
        );

        expect(_file('app/controllers/foo.js')).to.not.exist;
      });
    });

    it('controller foo/bar', function() {
      return emberGenerateDestroy(['controller', 'foo/bar'], _file => {
        expect(_file('src/ui/routes/foo/bar/controller.js')).to.equal(
          fixture('controller/controller-nested.js')
        );

        expect(_file('src/ui/routes/foo/bar/controller-test.js')).to.equal(
          fixture('controller-test/default-nested.js')
        );

        expect(_file('app/controllers/foo/bar.js')).to.not.exist;
      });
    });

    it('controller foo --dummy', function() {
      return emberGenerateDestroy(['controller', 'foo', '--dummy'], _file => {
        expect(_file('tests/dummy/src/ui/routes/foo/controller.js')).to.equal(
          fixture('controller/controller.js')
        );

        expect(_file('src/ui/routes/foo/controller.js')).to.not.exist;

        expect(_file('src/ui/routes/foo/controller-test.js')).to.not.exist;
      });
    });

    it('controller foo/bar --dummy', function() {
      return emberGenerateDestroy(['controller', 'foo/bar', '--dummy'], _file => {
        expect(_file('tests/dummy/src/ui/routes/foo/bar/controller.js')).to.equal(
          fixture('controller/controller-nested.js')
        );

        expect(_file('src/ui/routes/foo/bar/controller.js')).to.not.exist;

        expect(_file('src/ui/routes/foo/bar/controller-test.js')).to.not.exist;
      });
    });

    describe('with podModulePrefix', function() {
      beforeEach(function() {
        setupPodConfig({ podModulePrefix: true });
      });

      it('controller foo --pod podModulePrefix', function() {
        return expectError(
          emberGenerateDestroy(['controller', 'foo', '--pod']),
          "Pods aren't supported within a module unification app"
        );
      });
    });
  });

  describe('in in-repo-addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'in-repo-addon' }).then(() =>
        generateFakePackageManifest('ember-cli-qunit', '4.1.0')
      );
    });

    it('controller foo --in-repo-addon=my-addon', function() {
      return emberGenerateDestroy(['controller', 'foo', '--in-repo-addon=my-addon'], _file => {
        expect(_file('lib/my-addon/addon/controllers/foo.js')).to.equal(
          fixture('controller/controller.js')
        );

        expect(_file('lib/my-addon/app/controllers/foo.js')).to.contain(
          "export { default } from 'my-addon/controllers/foo';"
        );

        expect(_file('tests/unit/controllers/foo-test.js')).to.equal(
          fixture('controller-test/default.js')
        );
      });
    });

    it('controller foo/bar --in-repo-addon=my-addon', function() {
      return emberGenerateDestroy(['controller', 'foo/bar', '--in-repo-addon=my-addon'], _file => {
        expect(_file('lib/my-addon/addon/controllers/foo/bar.js')).to.equal(
          fixture('controller/controller-nested.js')
        );

        expect(_file('lib/my-addon/app/controllers/foo/bar.js')).to.contain(
          "export { default } from 'my-addon/controllers/foo/bar';"
        );

        expect(_file('tests/unit/controllers/foo/bar-test.js')).to.equal(
          fixture('controller-test/default-nested.js')
        );
      });
    });
  });
});
