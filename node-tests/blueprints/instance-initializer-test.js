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

describe('Blueprint: instance-initializer', function () {
  setupTestHooks(this);

  describe('in app', function () {
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

    it('instance-initializer foo', function () {
      return emberGenerateDestroy(['instance-initializer', 'foo'], (_file) => {
        expect(_file('app/instance-initializers/foo.js')).to.equal(
          fixture('instance-initializer/instance-initializer.js')
        );

        expect(_file('tests/unit/instance-initializers/foo-test.js')).to.contain(
          "import { initialize } from 'my-app/instance-initializers/foo';"
        );
      });
    });

    it('instance-initializer foo/bar', function () {
      return emberGenerateDestroy(['instance-initializer', 'foo/bar'], (_file) => {
        expect(_file('app/instance-initializers/foo/bar.js')).to.equal(
          fixture('instance-initializer/instance-initializer-nested.js')
        );

        expect(_file('tests/unit/instance-initializers/foo/bar-test.js')).to.contain(
          "import { initialize } from 'my-app/instance-initializers/foo/bar';"
        );
      });
    });

    it('instance-initializer foo --pod', function () {
      return emberGenerateDestroy(['instance-initializer', 'foo', '--pod'], (_file) => {
        expect(_file('app/instance-initializers/foo.js')).to.equal(
          fixture('instance-initializer/instance-initializer.js')
        );
      });
    });

    it('instance-initializer foo/bar --pod', function () {
      return emberGenerateDestroy(['instance-initializer', 'foo/bar', '--pod'], (_file) => {
        expect(_file('app/instance-initializers/foo/bar.js')).to.equal(
          fixture('instance-initializer/instance-initializer-nested.js')
        );
      });
    });

    describe('with podModulePrefix', function () {
      beforeEach(function () {
        setupPodConfig({ podModulePrefix: true });
      });

      it('instance-initializer foo --pod', function () {
        return emberGenerateDestroy(['instance-initializer', 'foo', '--pod'], (_file) => {
          expect(_file('app/instance-initializers/foo.js')).to.equal(
            fixture('instance-initializer/instance-initializer.js')
          );
        });
      });

      it('instance-initializer foo/bar --pod', function () {
        return emberGenerateDestroy(['instance-initializer', 'foo/bar', '--pod'], (_file) => {
          expect(_file('app/instance-initializers/foo/bar.js')).to.equal(
            fixture('instance-initializer/instance-initializer-nested.js')
          );
        });
      });
    });
  });

  describe('in addon', function () {
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

    it('instance-initializer foo', function () {
      return emberGenerateDestroy(['instance-initializer', 'foo'], (_file) => {
        expect(_file('addon/instance-initializers/foo.js')).to.equal(
          fixture('instance-initializer/instance-initializer.js')
        );

        expect(_file('app/instance-initializers/foo.js')).to.contain(
          "export { default, initialize } from 'my-addon/instance-initializers/foo';"
        );

        expect(_file('tests/unit/instance-initializers/foo-test.js'));
      });
    });

    it('instance-initializer foo/bar', function () {
      return emberGenerateDestroy(['instance-initializer', 'foo/bar'], (_file) => {
        expect(_file('addon/instance-initializers/foo/bar.js')).to.equal(
          fixture('instance-initializer/instance-initializer-nested.js')
        );

        expect(_file('app/instance-initializers/foo/bar.js')).to.contain(
          "export { default, initialize } from 'my-addon/instance-initializers/foo/bar';"
        );

        expect(_file('tests/unit/instance-initializers/foo/bar-test.js'));
      });
    });

    it('instance-initializer foo --dummy', function () {
      return emberGenerateDestroy(['instance-initializer', 'foo', '--dummy'], (_file) => {
        expect(_file('tests/dummy/app/instance-initializers/foo.js')).to.equal(
          fixture('instance-initializer/instance-initializer.js')
        );

        expect(_file('app/instance-initializers/foo.js')).to.not.exist;

        expect(_file('tests/unit/instance-initializers/foo-test.js')).to.not.exist;
      });
    });

    it('instance-initializer foo/bar --dummy', function () {
      return emberGenerateDestroy(['instance-initializer', 'foo/bar', '--dummy'], (_file) => {
        expect(_file('tests/dummy/app/instance-initializers/foo/bar.js')).to.equal(
          fixture('instance-initializer/instance-initializer-nested.js')
        );

        expect(_file('app/instance-initializers/foo/bar.js')).to.not.exist;

        expect(_file('tests/unit/instance-initializers/foo/bar-test.js')).to.not.exist;
      });
    });
  });

  describe('in in-repo-addon', function () {
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

    it('instance-initializer foo --in-repo-addon=my-addon', function () {
      return emberGenerateDestroy(
        ['instance-initializer', 'foo', '--in-repo-addon=my-addon'],
        (_file) => {
          expect(_file('lib/my-addon/addon/instance-initializers/foo.js')).to.equal(
            fixture('instance-initializer/instance-initializer.js')
          );

          expect(_file('lib/my-addon/app/instance-initializers/foo.js')).to.contain(
            "export { default, initialize } from 'my-addon/instance-initializers/foo';"
          );

          expect(_file('tests/unit/instance-initializers/foo-test.js')).to.exist;
        }
      );
    });

    it('instance-initializer foo/bar --in-repo-addon=my-addon', function () {
      return emberGenerateDestroy(
        ['instance-initializer', 'foo/bar', '--in-repo-addon=my-addon'],
        (_file) => {
          expect(_file('lib/my-addon/addon/instance-initializers/foo/bar.js')).to.equal(
            fixture('instance-initializer/instance-initializer.js')
          );

          expect(_file('lib/my-addon/app/instance-initializers/foo/bar.js')).to.contain(
            "export { default, initialize } from 'my-addon/instance-initializers/foo/bar';"
          );

          expect(_file('tests/unit/instance-initializers/foo/bar-test.js')).to.exist;
        }
      );
    });
  });
});
