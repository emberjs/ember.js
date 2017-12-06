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

  it('service foo', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['service', 'foo'], _file => {
        expect(_file('app/services/foo.js'))
          .to.contain("import Service from '@ember/service';")
          .to.contain('export default Service.extend({\n});');

        expect(_file('tests/unit/services/foo-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('service:foo'");
      }));
  });

  it('service foo/bar', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['service', 'foo/bar'], _file => {
        expect(_file('app/services/foo/bar.js'))
          .to.contain("import Service from '@ember/service';")
          .to.contain('export default Service.extend({\n});');

        expect(_file('tests/unit/services/foo/bar-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('service:foo/bar'");
      }));
  });
  it('in-addon service foo', function() {
    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(['service', 'foo'], _file => {
        expect(_file('addon/services/foo.js'))
          .to.contain("import Service from '@ember/service';")
          .to.contain('export default Service.extend({\n});');

        expect(_file('app/services/foo.js'))
          .to.contain("export { default } from 'my-addon/services/foo';");

        expect(_file('tests/unit/services/foo-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('service:foo'");
      }));
  });

  it('in-addon service foo/bar', function() {
    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(['service', 'foo/bar'], _file => {
        expect(_file('addon/services/foo/bar.js'))
          .to.contain("import Service from '@ember/service';")
          .to.contain('export default Service.extend({\n});');

        expect(_file('app/services/foo/bar.js'))
          .to.contain("export { default } from 'my-addon/services/foo/bar';");

        expect(_file('tests/unit/services/foo/bar-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('service:foo/bar'");
      }));
  });

  it('service foo --pod', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['service', 'foo', '--pod'], _file => {
        expect(_file('app/foo/service.js'))
          .to.contain("import Service from '@ember/service';")
          .to.contain('export default Service.extend({\n});');

        expect(_file('tests/unit/foo/service-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('service:foo'");
      }));
  });

  it('service foo/bar --pod', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['service', 'foo/bar', '--pod'], _file => {
        expect(_file('app/foo/bar/service.js'))
          .to.contain("import Service from '@ember/service';")
          .to.contain('export default Service.extend({\n});');

        expect(_file('tests/unit/foo/bar/service-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('service:foo/bar'");
      }));
  });

  it('service foo --pod podModulePrefix', function() {
    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(['service', 'foo', '--pod'], _file => {
        expect(_file('app/pods/foo/service.js'))
          .to.contain("import Service from '@ember/service';")
          .to.contain('export default Service.extend({\n});');

        expect(_file('tests/unit/pods/foo/service-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('service:foo'");
      }));
  });

  it('service foo/bar --pod podModulePrefix', function() {
    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(['service', 'foo/bar', '--pod'], _file => {
        expect(_file('app/pods/foo/bar/service.js'))
          .to.contain("import Service from '@ember/service';")
          .to.contain('export default Service.extend({\n});');

        expect(_file('tests/unit/pods/foo/bar/service-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('service:foo/bar'");
      }));
  });

  it('service-test foo', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['service-test', 'foo'], _file => {
        expect(_file('tests/unit/services/foo-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('service:foo'");
      }));
  });

  it('in-addon service-test foo', function() {
    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(['service-test', 'foo'], _file => {
        expect(_file('tests/unit/services/foo-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('service:foo'");

        expect(_file('app/service-test/foo.js'))
          .to.not.exist;
      }));
  });

  it('service-test foo for mocha', function() {
    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => generateFakePackageManifest('ember-cli-mocha', '0.11.0'))
      .then(() => emberGenerateDestroy(['service-test', 'foo'], _file => {
        expect(_file('tests/unit/services/foo-test.js'))
          .to.contain("import { describeModule, it } from 'ember-mocha';")
          .to.contain("describeModule('service:foo', 'Unit | Service | foo'");
      }));
  });

  it('service-test foo for mocha --pod', function() {
    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => generateFakePackageManifest('ember-cli-mocha', '0.11.0'))
      .then(() => emberGenerateDestroy(['service-test', 'foo', '--pod'], _file => {
        expect(_file('tests/unit/foo/service-test.js'))
          .to.contain("import { describeModule, it } from 'ember-mocha';")
          .to.contain("describeModule('service:foo', 'Unit | Service | foo'");
      }));
  });

  it('service-test foo for mocha v0.12+', function() {
    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => generateFakePackageManifest('ember-cli-mocha', '0.12.0'))
      .then(() => emberGenerateDestroy(['service-test', 'foo'], _file => {
        expect(_file('tests/unit/services/foo-test.js'))
          .to.contain("import { describe, it } from 'mocha';")
          .to.contain("import { setupTest } from 'ember-mocha';")
          .to.contain("describe('Unit | Service | foo', function() {")
          .to.contain("setupTest('service:foo',");
      }));
  });

  it('service-test foo for mocha v0.12+ --pod', function() {
    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => generateFakePackageManifest('ember-cli-mocha', '0.12.0'))
      .then(() => emberGenerateDestroy(['service-test', 'foo', '--pod'], _file => {
        expect(_file('tests/unit/foo/service-test.js'))
          .to.contain("import { describe, it } from 'mocha';")
          .to.contain("import { setupTest } from 'ember-mocha';")
          .to.contain("describe('Unit | Service | foo', function() {")
          .to.contain("setupTest('service:foo',");
      }));
  });
});
