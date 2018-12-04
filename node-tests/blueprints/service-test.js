'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const setupPodConfig = blueprintHelpers.setupPodConfig;
const expectError = require('../helpers/expect-error');

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;
const fs = require('fs-extra');

const generateFakePackageManifest = require('../helpers/generate-fake-package-manifest');
const enableModuleUnification = require('../helpers/module-unification').enableModuleUnification;
const fixture = require('../helpers/fixture');

describe('Blueprint: service', function() {
  setupTestHooks(this);

  describe('in app', function() {
    beforeEach(function() {
      return emberNew().then(() => generateFakePackageManifest('ember-cli-qunit', '4.1.0'));
    });

    it('service foo', function() {
      return emberGenerateDestroy(['service', 'foo'], _file => {
        expect(_file('app/services/foo.js')).to.equal(fixture('service/service.js'));

        expect(_file('tests/unit/services/foo-test.js')).to.equal(
          fixture('service-test/default.js')
        );
      });
    });

    it('service foo/bar', function() {
      return emberGenerateDestroy(['service', 'foo/bar'], _file => {
        expect(_file('app/services/foo/bar.js')).to.equal(fixture('service/service-nested.js'));

        expect(_file('tests/unit/services/foo/bar-test.js')).to.equal(
          fixture('service-test/default-nested.js')
        );
      });
    });

    it('service foo --pod', function() {
      return emberGenerateDestroy(['service', 'foo', '--pod'], _file => {
        expect(_file('app/foo/service.js')).to.equal(fixture('service/service.js'));

        expect(_file('tests/unit/foo/service-test.js')).to.equal(
          fixture('service-test/default.js')
        );
      });
    });

    it('service foo/bar --pod', function() {
      return emberGenerateDestroy(['service', 'foo/bar', '--pod'], _file => {
        expect(_file('app/foo/bar/service.js')).to.equal(fixture('service/service-nested.js'));

        expect(_file('tests/unit/foo/bar/service-test.js')).to.equal(
          fixture('service-test/default-nested.js')
        );
      });
    });

    describe('with podModulePrefix', function() {
      beforeEach(function() {
        setupPodConfig({ podModulePrefix: true });
      });

      it('service foo --pod', function() {
        return emberGenerateDestroy(['service', 'foo', '--pod'], _file => {
          expect(_file('app/pods/foo/service.js')).to.equal(fixture('service/service.js'));

          expect(_file('tests/unit/pods/foo/service-test.js')).to.equal(
            fixture('service-test/default.js')
          );
        });
      });

      it('service foo/bar --pod', function() {
        return emberGenerateDestroy(['service', 'foo/bar', '--pod'], _file => {
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

  describe('in app - module unification', function() {
    enableModuleUnification();

    beforeEach(function() {
      return emberNew()
        .then(() => fs.ensureDirSync('src'))
        .then(() => generateFakePackageManifest('ember-cli-qunit', '4.1.0'));
    });

    it('service foo', function() {
      return emberGenerateDestroy(['service', 'foo'], _file => {
        expect(_file('src/services/foo.js')).to.equal(fixture('service/service.js'));

        expect(_file('src/services/foo-test.js')).to.equal(fixture('service-test/default.js'));
      });
    });

    it('service foo/bar', function() {
      return emberGenerateDestroy(['service', 'foo/bar'], _file => {
        expect(_file('src/services/foo/bar.js')).to.equal(fixture('service/service-nested.js'));

        expect(_file('src/services/foo/bar-test.js')).to.equal(
          fixture('service-test/default-nested.js')
        );
      });
    });

    it('service foo --pod', function() {
      return expectError(
        emberGenerateDestroy(['service', 'foo', '--pod']),
        "Pods aren't supported within a module unification app"
      );
    });
  });

  describe('in addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' }).then(() =>
        generateFakePackageManifest('ember-cli-qunit', '4.1.0')
      );
    });

    it('service foo', function() {
      return emberGenerateDestroy(['service', 'foo'], _file => {
        expect(_file('addon/services/foo.js')).to.equal(fixture('service/service.js'));

        expect(_file('app/services/foo.js')).to.contain(
          "export { default } from 'my-addon/services/foo';"
        );

        expect(_file('tests/unit/services/foo-test.js')).to.equal(
          fixture('service-test/default.js')
        );
      });
    });

    it('service foo/bar', function() {
      return emberGenerateDestroy(['service', 'foo/bar'], _file => {
        expect(_file('addon/services/foo/bar.js')).to.equal(fixture('service/service-nested.js'));

        expect(_file('app/services/foo/bar.js')).to.contain(
          "export { default } from 'my-addon/services/foo/bar';"
        );

        expect(_file('tests/unit/services/foo/bar-test.js')).to.equal(
          fixture('service-test/default-nested.js')
        );
      });
    });
  });

  describe('in addon - module unification', function() {
    enableModuleUnification();

    beforeEach(function() {
      return emberNew({ target: 'addon' })
        .then(() => fs.ensureDirSync('src'))
        .then(() => generateFakePackageManifest('ember-cli-qunit', '4.1.0'));
    });

    it('service foo', function() {
      return emberGenerateDestroy(['service', 'foo'], _file => {
        expect(_file('src/services/foo.js')).to.equal(fixture('service/service.js'));

        expect(_file('src/services/foo-test.js')).to.equal(fixture('service-test/default.js'));

        expect(_file('app/services/foo.js')).to.not.exist;
      });
    });

    it('service foo/bar', function() {
      return emberGenerateDestroy(['service', 'foo/bar'], _file => {
        expect(_file('src/services/foo/bar.js')).to.equal(fixture('service/service-nested.js'));

        expect(_file('src/services/foo/bar-test.js')).to.equal(
          fixture('service-test/default-nested.js')
        );

        expect(_file('app/services/foo/bar.js')).to.not.exist;
      });
    });
  });

  describe('in in-repo-addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'in-repo-addon' }).then(() =>
        generateFakePackageManifest('ember-cli-qunit', '4.1.0')
      );
    });

    it('service foo --in-repo-addon=my-addon', function() {
      return emberGenerateDestroy(['service', 'foo', '--in-repo-addon=my-addon'], _file => {
        expect(_file('lib/my-addon/addon/services/foo.js')).to.equal(fixture('service/service.js'));

        expect(_file('lib/my-addon/app/services/foo.js')).to.contain(
          "export { default } from 'my-addon/services/foo';"
        );

        expect(_file('tests/unit/services/foo-test.js')).to.equal(
          fixture('service-test/default.js')
        );
      });
    });

    it('service foo/bar --in-repo-addon=my-addon', function() {
      return emberGenerateDestroy(['service', 'foo/bar', '--in-repo-addon=my-addon'], _file => {
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
