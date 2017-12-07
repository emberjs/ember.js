'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const modifyPackages = blueprintHelpers.modifyPackages;
const setupPodConfig = blueprintHelpers.setupPodConfig;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

const generateFakePackageManifest = require('../helpers/generate-fake-package-manifest');

describe('Blueprint: controller', function() {
  setupTestHooks(this);

  describe('in app', function() {
    beforeEach(function() {
      return emberNew();
    });

    it('controller foo', function() {
      return emberGenerateDestroy(['controller', 'foo'], _file => {
        expect(_file('app/controllers/foo.js'))
          .to.contain("import Controller from '@ember/controller';")
          .to.contain("export default Controller.extend({\n});");

        expect(_file('tests/unit/controllers/foo-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo'");
      });
    });

    it('controller foo/bar', function() {
      return emberGenerateDestroy(['controller', 'foo/bar'], _file => {
        expect(_file('app/controllers/foo/bar.js'))
          .to.contain("import Controller from '@ember/controller';")
          .to.contain("export default Controller.extend({\n});");

        expect(_file('tests/unit/controllers/foo/bar-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo/bar'");
      });
    });

    it('controller foo --pod', function() {
      return emberGenerateDestroy(['controller', 'foo', '--pod'], _file => {
        expect(_file('app/foo/controller.js'))
          .to.contain("import Controller from '@ember/controller';")
          .to.contain("export default Controller.extend({\n});");

        expect(_file('tests/unit/foo/controller-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo'");
      });
    });

    it('controller foo/bar --pod', function() {
      return emberGenerateDestroy(['controller', 'foo/bar', '--pod'], _file => {
        expect(_file('app/foo/bar/controller.js'))
          .to.contain("import Controller from '@ember/controller';")
          .to.contain("export default Controller.extend({\n});");

        expect(_file('tests/unit/foo/bar/controller-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo/bar'");
      });
    });

    it('controller-test foo', function() {
      return emberGenerateDestroy(['controller-test', 'foo'], _file => {
        expect(_file('tests/unit/controllers/foo-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo'");
      });
    });

    describe('with podModulePrefix', function() {
      beforeEach(function() {
        setupPodConfig({ podModulePrefix: true });
      });

      it('controller foo --pod podModulePrefix', function() {
        return emberGenerateDestroy(['controller', 'foo', '--pod'], _file => {
          expect(_file('app/pods/foo/controller.js'))
            .to.contain("import Controller from '@ember/controller';")
            .to.contain("export default Controller.extend({\n});");

          expect(_file('tests/unit/pods/foo/controller-test.js'))
            .to.contain("import { moduleFor, test } from 'ember-qunit';")
            .to.contain("moduleFor('controller:foo'");
        });
      });

      it('controller foo/bar --pod podModulePrefix', function() {
        return emberGenerateDestroy(['controller', 'foo/bar', '--pod'], _file => {
          expect(_file('app/pods/foo/bar/controller.js'))
            .to.contain("import Controller from '@ember/controller';")
            .to.contain("export default Controller.extend({\n});");

          expect(_file('tests/unit/pods/foo/bar/controller-test.js'))
            .to.contain("import { moduleFor, test } from 'ember-qunit';")
            .to.contain("moduleFor('controller:foo/bar'");
        });
      });
    });

    describe('with ember-cli-mocha@0.11.0', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-cli-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true }
        ]);
        generateFakePackageManifest('ember-cli-mocha', '0.11.0');
      });

      it('controller-test foo for mocha', function() {
        return emberGenerateDestroy(['controller-test', 'foo'], _file => {
          expect(_file('tests/unit/controllers/foo-test.js'))
            .to.contain("import { describeModule, it } from 'ember-mocha';")
            .to.contain("describeModule('controller:foo', 'Unit | Controller | foo'");
        });
      });
    });

    describe('with ember-cli-mocha@0.12.0', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-cli-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true }
        ]);
        generateFakePackageManifest('ember-cli-mocha', '0.12.0');
      });

      it('controller-test foo', function() {
        return emberGenerateDestroy(['controller-test', 'foo'], _file => {
          expect(_file('tests/unit/controllers/foo-test.js'))
            .to.contain("import { describe, it } from 'mocha';")
            .to.contain("import { setupTest } from 'ember-mocha';")
            .to.contain("describe('Unit | Controller | foo'")
            .to.contain("setupTest('controller:foo',");
        });
      });
    });
  });

  describe('in addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' });
    });

    it('controller foo', function() {
      return emberGenerateDestroy(['controller', 'foo'], _file => {
        expect(_file('addon/controllers/foo.js'))
          .to.contain("import Controller from '@ember/controller';")
          .to.contain("export default Controller.extend({\n});");

        expect(_file('app/controllers/foo.js'))
          .to.contain("export { default } from 'my-addon/controllers/foo';");

        expect(_file('tests/unit/controllers/foo-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo'");
      });
    });

    it('controller foo/bar', function() {
      return emberGenerateDestroy(['controller', 'foo/bar'], _file => {
        expect(_file('addon/controllers/foo/bar.js'))
          .to.contain("import Controller from '@ember/controller';")
          .to.contain("export default Controller.extend({\n});");

        expect(_file('app/controllers/foo/bar.js'))
          .to.contain("export { default } from 'my-addon/controllers/foo/bar';");

        expect(_file('tests/unit/controllers/foo/bar-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo/bar'");
      });
    });

    it('controller foo --dummy', function() {
      return emberGenerateDestroy(['controller', 'foo', '--dummy'], _file => {
        expect(_file('tests/dummy/app/controllers/foo.js'))
          .to.contain("import Controller from '@ember/controller';")
          .to.contain("export default Controller.extend({\n});");

        expect(_file('app/controllers/foo-test.js'))
          .to.not.exist;

        expect(_file('tests/unit/controllers/foo-test.js'))
          .to.not.exist;
      });
    });

    it('controller foo/bar --dummy', function() {
      return emberGenerateDestroy(['controller', 'foo/bar', '--dummy'], _file => {
        expect(_file('tests/dummy/app/controllers/foo/bar.js'))
          .to.contain("import Controller from '@ember/controller';")
          .to.contain("export default Controller.extend({\n});");

        expect(_file('app/controllers/foo/bar.js'))
          .to.not.exist;

        expect(_file('tests/unit/controllers/foo/bar-test.js'))
          .to.not.exist;
      });
    });

    it('controller-test foo', function() {
      return emberGenerateDestroy(['controller-test', 'foo'], _file => {
        expect(_file('tests/unit/controllers/foo-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo'");
      });
    });
  });

  describe('in in-repo-addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'in-repo-addon' });
    });

    it('controller foo --in-repo-addon=my-addon', function() {
      return emberGenerateDestroy(['controller', 'foo', '--in-repo-addon=my-addon'], _file => {
        expect(_file('lib/my-addon/addon/controllers/foo.js'))
          .to.contain("import Controller from '@ember/controller';")
          .to.contain("export default Controller.extend({\n});");

        expect(_file('lib/my-addon/app/controllers/foo.js'))
          .to.contain("export { default } from 'my-addon/controllers/foo';");

        expect(_file('tests/unit/controllers/foo-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo'");
      });
    });

    it('controller foo/bar --in-repo-addon=my-addon', function() {
      return emberGenerateDestroy(['controller', 'foo/bar', '--in-repo-addon=my-addon'], _file => {
        expect(_file('lib/my-addon/addon/controllers/foo/bar.js'))
          .to.contain("import Controller from '@ember/controller';")
          .to.contain("export default Controller.extend({\n});");

        expect(_file('lib/my-addon/app/controllers/foo/bar.js'))
          .to.contain("export { default } from 'my-addon/controllers/foo/bar';");

        expect(_file('tests/unit/controllers/foo/bar-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo/bar'");
      });
    });
  });
});
