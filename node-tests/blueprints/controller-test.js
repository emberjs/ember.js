'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const setupPodConfig = blueprintHelpers.setupPodConfig;
const modifyPackages = blueprintHelpers.modifyPackages;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

const generateFakePackageManifest = require('../helpers/generate-fake-package-manifest');
const fixture = require('../helpers/fixture');

const setupTestEnvironment = require('../helpers/setup-test-environment');
const enableOctane = setupTestEnvironment.enableOctane;

describe('Blueprint: controller', function () {
  setupTestHooks(this);

  describe('in app - octane', function () {
    enableOctane();

    beforeEach(function () {
      return emberNew()
        .then(() =>
          modifyPackages([
            { name: 'ember-qunit', delete: true },
            { name: 'ember-cli-qunit', dev: true },
          ])
        )
        .then(() => generateFakePackageManifest('ember-cli-qunit', '4.1.0'));
    });

    it('controller foo', function () {
      return emberGenerateDestroy(['controller', 'foo'], (_file) => {
        expect(_file('app/controllers/foo.js')).to.equal(fixture('controller/controller.js'));

        expect(_file('tests/unit/controllers/foo-test.js')).to.equal(
          fixture('controller-test/default.js')
        );
      });
    });

    it('controller foo.js', function () {
      return emberGenerateDestroy(['controller', 'foo.js'], (_file) => {
        expect(_file('app/controllers/foo.js.js')).to.not.exist;
        expect(_file('tests/unit/controllers/foo.js-test.js')).to.not.exist;

        expect(_file('app/controllers/foo.js')).to.equal(fixture('controller/controller.js'));

        expect(_file('tests/unit/controllers/foo-test.js')).to.equal(
          fixture('controller-test/default.js')
        );
      });
    });

    it('controller foo/bar', function () {
      return emberGenerateDestroy(['controller', 'foo/bar'], (_file) => {
        expect(_file('app/controllers/foo/bar.js')).to.equal(
          fixture('controller/controller-nested.js')
        );

        expect(_file('tests/unit/controllers/foo/bar-test.js')).to.equal(
          fixture('controller-test/default-nested.js')
        );
      });
    });

    it('controller foo --pod', function () {
      return emberGenerateDestroy(['controller', 'foo', '--pod'], (_file) => {
        expect(_file('app/foo/controller.js')).to.equal(fixture('controller/controller.js'));

        expect(_file('tests/unit/foo/controller-test.js')).to.equal(
          fixture('controller-test/default.js')
        );
      });
    });

    it('controller foo.js --pod', function () {
      return emberGenerateDestroy(['controller', 'foo.js', '--pod'], (_file) => {
        expect(_file('app/foo.js/controller.js')).to.not.exist;
        expect(_file('tests/unit/foo.js/controller-test.js')).to.not.exist;

        expect(_file('app/foo/controller.js')).to.equal(fixture('controller/controller.js'));

        expect(_file('tests/unit/foo/controller-test.js')).to.equal(
          fixture('controller-test/default.js')
        );
      });
    });

    it('controller foo/bar --pod', function () {
      return emberGenerateDestroy(['controller', 'foo/bar', '--pod'], (_file) => {
        expect(_file('app/foo/bar/controller.js')).to.equal(
          fixture('controller/controller-nested.js')
        );

        expect(_file('tests/unit/foo/bar/controller-test.js')).to.equal(
          fixture('controller-test/default-nested.js')
        );
      });
    });

    describe('with podModulePrefix', function () {
      enableOctane();
      beforeEach(function () {
        setupPodConfig({ podModulePrefix: true });
      });

      it('controller foo --pod podModulePrefix', function () {
        return emberGenerateDestroy(['controller', 'foo', '--pod'], (_file) => {
          expect(_file('app/pods/foo/controller.js')).to.equal(fixture('controller/controller.js'));

          expect(_file('tests/unit/pods/foo/controller-test.js')).to.equal(
            fixture('controller-test/default.js')
          );
        });
      });

      it('controller foo.js --pod podModulePrefix', function () {
        return emberGenerateDestroy(['controller', 'foo.js', '--pod'], (_file) => {
          expect(_file('app/pods/foo.js/controller.js')).to.not.exist;
          expect(_file('tests/unit/pods/foo.js/controller-test.js')).to.not.exist;
          expect(_file('app/pods/foo/controller.js')).to.equal(fixture('controller/controller.js'));

          expect(_file('tests/unit/pods/foo/controller-test.js')).to.equal(
            fixture('controller-test/default.js')
          );
        });
      });

      it('controller foo/bar --pod podModulePrefix', function () {
        return emberGenerateDestroy(['controller', 'foo/bar', '--pod'], (_file) => {
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

  describe('in addon - octane', function () {
    enableOctane();

    beforeEach(function () {
      return emberNew({ target: 'addon' })
        .then(() =>
          modifyPackages([
            { name: 'ember-qunit', delete: true },
            { name: 'ember-cli-qunit', dev: true },
          ])
        )
        .then(() => generateFakePackageManifest('ember-cli-qunit', '4.1.0'));
    });

    it('controller foo', function () {
      return emberGenerateDestroy(['controller', 'foo'], (_file) => {
        expect(_file('addon/controllers/foo.js')).to.equal(fixture('controller/controller.js'));

        expect(_file('app/controllers/foo.js')).to.contain(
          "export { default } from 'my-addon/controllers/foo';"
        );

        expect(_file('tests/unit/controllers/foo-test.js')).to.equal(
          fixture('controller-test/default.js')
        );
      });
    });

    it('controller foo.js', function () {
      return emberGenerateDestroy(['controller', 'foo.js'], (_file) => {
        expect(_file('addon/controllers/foo.js.js')).to.not.exist;
        expect(_file('app/controllers/foo.js.js')).to.not.exist;
        expect(_file('tests/unit/controllers/foo.js-test.js')).to.not.exist;

        expect(_file('addon/controllers/foo.js')).to.equal(fixture('controller/controller.js'));

        expect(_file('app/controllers/foo.js')).to.contain(
          "export { default } from 'my-addon/controllers/foo';"
        );

        expect(_file('tests/unit/controllers/foo-test.js')).to.equal(
          fixture('controller-test/default.js')
        );
      });
    });

    it('controller foo/bar', function () {
      return emberGenerateDestroy(['controller', 'foo/bar'], (_file) => {
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

    it('controller foo --dummy', function () {
      return emberGenerateDestroy(['controller', 'foo', '--dummy'], (_file) => {
        expect(_file('tests/dummy/app/controllers/foo.js')).to.equal(
          fixture('controller/controller.js')
        );

        expect(_file('app/controllers/foo-test.js')).to.not.exist;

        expect(_file('tests/unit/controllers/foo-test.js')).to.not.exist;
      });
    });

    it('controller foo.js --dummy', function () {
      return emberGenerateDestroy(['controller', 'foo.js', '--dummy'], (_file) => {
        expect(_file('tests/dummy/app/controllers/foo.js.js')).to.not.exist;

        expect(_file('tests/dummy/app/controllers/foo.js')).to.equal(
          fixture('controller/controller.js')
        );

        expect(_file('app/controllers/foo-test.js')).to.not.exist;

        expect(_file('tests/unit/controllers/foo-test.js')).to.not.exist;
      });
    });

    it('controller foo/bar --dummy', function () {
      return emberGenerateDestroy(['controller', 'foo/bar', '--dummy'], (_file) => {
        expect(_file('tests/dummy/app/controllers/foo/bar.js')).to.equal(
          fixture('controller/controller-nested.js')
        );

        expect(_file('app/controllers/foo/bar.js')).to.not.exist;

        expect(_file('tests/unit/controllers/foo/bar-test.js')).to.not.exist;
      });
    });
  });

  describe('in in-repo-addon', function () {
    enableOctane();
    beforeEach(function () {
      return emberNew({ target: 'in-repo-addon' })
        .then(() =>
          modifyPackages([
            { name: 'ember-qunit', delete: true },
            { name: 'ember-cli-qunit', dev: true },
          ])
        )
        .then(() => generateFakePackageManifest('ember-cli-qunit', '4.1.0'));
    });

    it('controller foo --in-repo-addon=my-addon', function () {
      return emberGenerateDestroy(['controller', 'foo', '--in-repo-addon=my-addon'], (_file) => {
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

    it('controller foo.js --in-repo-addon=my-addon', function () {
      return emberGenerateDestroy(['controller', 'foo.js', '--in-repo-addon=my-addon'], (_file) => {
        expect(_file('lib/my-addon/addon/controllers/foo.js.js')).to.not.exist;
        expect(_file('lib/my-addon/app/controllers/foo.js.js')).to.not.exist;
        expect(_file('tests/unit/controllers/foo.js-test.js')).to.not.exist;

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

    it('controller foo/bar --in-repo-addon=my-addon', function () {
      return emberGenerateDestroy(
        ['controller', 'foo/bar', '--in-repo-addon=my-addon'],
        (_file) => {
          expect(_file('lib/my-addon/addon/controllers/foo/bar.js')).to.equal(
            fixture('controller/controller-nested.js')
          );

          expect(_file('lib/my-addon/app/controllers/foo/bar.js')).to.contain(
            "export { default } from 'my-addon/controllers/foo/bar';"
          );

          expect(_file('tests/unit/controllers/foo/bar-test.js')).to.equal(
            fixture('controller-test/default-nested.js')
          );
        }
      );
    });
  });
});
