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

describe('Blueprint: service', function() {
  setupTestHooks(this);

  describe('in app', function() {
    beforeEach(function() {
      return emberNew();
    });

    it('service foo', function() {
      return emberGenerateDestroy(['service', 'foo'], _file => {
        expect(_file('app/services/foo.js'))
          .to.contain("import Service from '@ember/service';")
          .to.contain('export default Service.extend({\n});');

        expect(_file('tests/unit/services/foo-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('service:foo'");
      });
    });

    it('service foo/bar', function() {
      return emberGenerateDestroy(['service', 'foo/bar'], _file => {
        expect(_file('app/services/foo/bar.js'))
          .to.contain("import Service from '@ember/service';")
          .to.contain('export default Service.extend({\n});');

        expect(_file('tests/unit/services/foo/bar-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('service:foo/bar'");
      });
    });

    it('service foo --pod', function() {
      return emberGenerateDestroy(['service', 'foo', '--pod'], _file => {
        expect(_file('app/foo/service.js'))
          .to.contain("import Service from '@ember/service';")
          .to.contain('export default Service.extend({\n});');

        expect(_file('tests/unit/foo/service-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('service:foo'");
      });
    });

    it('service foo/bar --pod', function() {
      return emberGenerateDestroy(['service', 'foo/bar', '--pod'], _file => {
        expect(_file('app/foo/bar/service.js'))
          .to.contain("import Service from '@ember/service';")
          .to.contain('export default Service.extend({\n});');

        expect(_file('tests/unit/foo/bar/service-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('service:foo/bar'");
      });
    });

    describe('with podModulePrefix', function() {
      beforeEach(function() {
        setupPodConfig({ podModulePrefix: true });
      });

      it('service foo --pod', function() {
        return emberGenerateDestroy(['service', 'foo', '--pod'], _file => {
          expect(_file('app/pods/foo/service.js'))
            .to.contain("import Service from '@ember/service';")
            .to.contain('export default Service.extend({\n});');

          expect(_file('tests/unit/pods/foo/service-test.js'))
            .to.contain("import { moduleFor, test } from 'ember-qunit';")
            .to.contain("moduleFor('service:foo'");
        });
      });

      it('service foo/bar --pod', function() {
        return emberGenerateDestroy(['service', 'foo/bar', '--pod'], _file => {
          expect(_file('app/pods/foo/bar/service.js'))
            .to.contain("import Service from '@ember/service';")
            .to.contain('export default Service.extend({\n});');

          expect(_file('tests/unit/pods/foo/bar/service-test.js'))
            .to.contain("import { moduleFor, test } from 'ember-qunit';")
            .to.contain("moduleFor('service:foo/bar'");
        });
      });
    });
  });

  describe('in addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' });
    });

    it('service foo', function() {
      return emberGenerateDestroy(['service', 'foo'], _file => {
        expect(_file('addon/services/foo.js'))
          .to.contain("import Service from '@ember/service';")
          .to.contain('export default Service.extend({\n});');

        expect(_file('app/services/foo.js'))
          .to.contain("export { default } from 'my-addon/services/foo';");

        expect(_file('tests/unit/services/foo-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('service:foo'");
      });
    });

    it('service foo/bar', function() {
      return emberGenerateDestroy(['service', 'foo/bar'], _file => {
        expect(_file('addon/services/foo/bar.js'))
          .to.contain("import Service from '@ember/service';")
          .to.contain('export default Service.extend({\n});');

        expect(_file('app/services/foo/bar.js'))
          .to.contain("export { default } from 'my-addon/services/foo/bar';");

        expect(_file('tests/unit/services/foo/bar-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('service:foo/bar'");
      });
    });
  });
});
