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

describe('Blueprint: service', function () {
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

    it('service foo', function () {
      return emberGenerateDestroy(['service', 'foo'], (_file) => {
        expect(_file('app/services/foo.js')).to.equal(fixture('service/service.js'));

        expect(_file('tests/unit/services/foo-test.js')).to.equal(
          fixture('service-test/default.js')
        );
      });
    });

    it('service foo.js', function () {
      return emberGenerateDestroy(['service', 'foo.js'], (_file) => {
        expect(_file('app/services/foo.js.js')).to.not.exist;
        expect(_file('tests/unit/services/foo.js-test.js')).to.not.exist;

        expect(_file('app/services/foo.js')).to.equal(fixture('service/service.js'));

        expect(_file('tests/unit/services/foo-test.js')).to.equal(
          fixture('service-test/default.js')
        );
      });
    });

    it('service foo/bar', function () {
      return emberGenerateDestroy(['service', 'foo/bar'], (_file) => {
        expect(_file('app/services/foo/bar.js')).to.equal(fixture('service/service-nested.js'));

        expect(_file('tests/unit/services/foo/bar-test.js')).to.equal(
          fixture('service-test/default-nested.js')
        );
      });
    });

    it('service foo --pod', function () {
      return emberGenerateDestroy(['service', 'foo', '--pod'], (_file) => {
        expect(_file('app/foo/service.js')).to.equal(fixture('service/service.js'));

        expect(_file('tests/unit/foo/service-test.js')).to.equal(
          fixture('service-test/default.js')
        );
      });
    });

    it('service foo.js --pod', function () {
      return emberGenerateDestroy(['service', 'foo.js', '--pod'], (_file) => {
        expect(_file('app/foo.js/service.js')).to.not.exist;
        expect(_file('tests/unit/foo.js/service-test.js')).to.not.exist;

        expect(_file('app/foo/service.js')).to.equal(fixture('service/service.js'));

        expect(_file('tests/unit/foo/service-test.js')).to.equal(
          fixture('service-test/default.js')
        );
      });
    });

    it('service foo/bar --pod', function () {
      return emberGenerateDestroy(['service', 'foo/bar', '--pod'], (_file) => {
        expect(_file('app/foo/bar/service.js')).to.equal(fixture('service/service-nested.js'));

        expect(_file('tests/unit/foo/bar/service-test.js')).to.equal(
          fixture('service-test/default-nested.js')
        );
      });
    });

    describe('with podModulePrefix', function () {
      enableOctane();

      beforeEach(function () {
        setupPodConfig({ podModulePrefix: true });
      });

      it('service foo --pod', function () {
        return emberGenerateDestroy(['service', 'foo', '--pod'], (_file) => {
          expect(_file('app/pods/foo/service.js')).to.equal(fixture('service/service.js'));

          expect(_file('tests/unit/pods/foo/service-test.js')).to.equal(
            fixture('service-test/default.js')
          );
        });
      });

      it('service foo.js --pod', function () {
        return emberGenerateDestroy(['service', 'foo.js', '--pod'], (_file) => {
          expect(_file('app/pods/foo.js/service.js')).to.not.exist;
          expect(_file('tests/unit/pods/foo.js/service-test.js')).to.not.exist;

          expect(_file('app/pods/foo/service.js')).to.equal(fixture('service/service.js'));

          expect(_file('tests/unit/pods/foo/service-test.js')).to.equal(
            fixture('service-test/default.js')
          );
        });
      });

      it('service foo/bar --pod', function () {
        return emberGenerateDestroy(['service', 'foo/bar', '--pod'], (_file) => {
          expect(_file('app/pods/foo/bar/service.js')).to.equal(
            fixture('service/service-nested.js')
          );

          expect(_file('tests/unit/pods/foo/bar/service-test.js')).to.equal(
            fixture('service-test/default-nested.js')
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

    it('service foo', function () {
      return emberGenerateDestroy(['service', 'foo'], (_file) => {
        expect(_file('addon/services/foo.js')).to.equal(fixture('service/service.js'));

        expect(_file('app/services/foo.js')).to.contain(
          "export { default } from 'my-addon/services/foo';"
        );

        expect(_file('tests/unit/services/foo-test.js')).to.equal(
          fixture('service-test/default.js')
        );
      });
    });

    it('service foo.js', function () {
      return emberGenerateDestroy(['service', 'foo.js'], (_file) => {
        expect(_file('addon/services/foo.js.js')).to.not.exist;
        expect(_file('app/services/foo.js.js')).to.not.exist;
        expect(_file('tests/unit/services/foo.js-test.js')).to.not.exist;

        expect(_file('addon/services/foo.js')).to.equal(fixture('service/service.js'));

        expect(_file('app/services/foo.js')).to.contain(
          "export { default } from 'my-addon/services/foo';"
        );

        expect(_file('tests/unit/services/foo-test.js')).to.equal(
          fixture('service-test/default.js')
        );
      });
    });

    it('service foo/bar', function () {
      return emberGenerateDestroy(['service', 'foo/bar'], (_file) => {
        expect(_file('addon/services/foo/bar.js')).to.equal(fixture('service/service-nested.js'));

        expect(_file('app/services/foo/bar.js')).to.contain(
          "export { default } from 'my-addon/services/foo/bar';"
        );

        expect(_file('tests/unit/services/foo/bar-test.js')).to.equal(
          fixture('service-test/default-nested.js')
        );
      });
    });

    it('service foo/bar --dummy', function () {
      return emberGenerateDestroy(['service', 'foo/bar', '--dummy'], (_file) => {
        expect(_file('tests/dummy/app/services/foo/bar.js')).to.equal(
          fixture('service/service-nested.js')
        );
        expect(_file('addon/services/foo/bar.js')).to.not.exist;
      });
    });

    it('service foo/bar.js --dummy', function () {
      return emberGenerateDestroy(['service', 'foo/bar.js', '--dummy'], (_file) => {
        expect(_file('tests/dummy/app/services/foo/bar.js.js')).to.not.exist;

        expect(_file('tests/dummy/app/services/foo/bar.js')).to.equal(
          fixture('service/service-nested.js')
        );
        expect(_file('addon/services/foo/bar.js')).to.not.exist;
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

    it('service foo --in-repo-addon=my-addon', function () {
      return emberGenerateDestroy(['service', 'foo', '--in-repo-addon=my-addon'], (_file) => {
        expect(_file('lib/my-addon/addon/services/foo.js')).to.equal(fixture('service/service.js'));

        expect(_file('lib/my-addon/app/services/foo.js')).to.contain(
          "export { default } from 'my-addon/services/foo';"
        );

        expect(_file('tests/unit/services/foo-test.js')).to.equal(
          fixture('service-test/default.js')
        );
      });
    });

    it('service foo.js --in-repo-addon=my-addon', function () {
      return emberGenerateDestroy(['service', 'foo.js', '--in-repo-addon=my-addon'], (_file) => {
        expect(_file('lib/my-addon/addon/services/foo.js.js')).to.not.exist;
        expect(_file('lib/my-addon/app/services/foo.js.js')).to.not.exist;
        expect(_file('tests/unit/services/foo.js-test.js')).to.not.exist;

        expect(_file('lib/my-addon/addon/services/foo.js')).to.equal(fixture('service/service.js'));

        expect(_file('lib/my-addon/app/services/foo.js')).to.contain(
          "export { default } from 'my-addon/services/foo';"
        );

        expect(_file('tests/unit/services/foo-test.js')).to.equal(
          fixture('service-test/default.js')
        );
      });
    });

    it('service foo/bar --in-repo-addon=my-addon', function () {
      return emberGenerateDestroy(['service', 'foo/bar', '--in-repo-addon=my-addon'], (_file) => {
        expect(_file('lib/my-addon/addon/services/foo/bar.js')).to.equal(
          fixture('service/service-nested.js')
        );

        expect(_file('lib/my-addon/app/services/foo/bar.js')).to.contain(
          "export { default } from 'my-addon/services/foo/bar';"
        );

        expect(_file('tests/unit/services/foo/bar-test.js')).to.equal(
          fixture('service-test/default-nested.js')
        );
      });
    });
  });
});
