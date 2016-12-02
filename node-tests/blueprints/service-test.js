'use strict';

var blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
var setupTestHooks = blueprintHelpers.setupTestHooks;
var emberNew = blueprintHelpers.emberNew;
var emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
var modifyPackages = blueprintHelpers.modifyPackages;
var setupPodConfig = blueprintHelpers.setupPodConfig;

var chai = require('ember-cli-blueprint-test-helpers/chai');
var expect = chai.expect;

var generateFakePackageManifest = require('../helpers/generate-fake-package-manifest');

describe('Acceptance: ember generate and destroy service', function() {
  setupTestHooks(this);

  it('service foo', function() {
    var args = ['service', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/services/foo.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain('export default Ember.Service.extend({\n});');

        expect(_file('tests/unit/services/foo-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('service:foo'");
      }));
  });

  it('service foo/bar', function() {
    var args = ['service', 'foo/bar'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/services/foo/bar.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain('export default Ember.Service.extend({\n});');

        expect(_file('tests/unit/services/foo/bar-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('service:foo/bar'");
      }));
  });
  it('in-addon service foo', function() {
    var args = ['service', 'foo'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('addon/services/foo.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain('export default Ember.Service.extend({\n});');

        expect(_file('app/services/foo.js'))
          .to.contain("export { default } from 'my-addon/services/foo';");

        expect(_file('tests/unit/services/foo-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('service:foo'");
      }));
  });

  it('in-addon service foo/bar', function() {
    var args = ['service', 'foo/bar'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('addon/services/foo/bar.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain('export default Ember.Service.extend({\n});');

        expect(_file('app/services/foo/bar.js'))
          .to.contain("export { default } from 'my-addon/services/foo/bar';");

        expect(_file('tests/unit/services/foo/bar-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('service:foo/bar'");
      }));
  });

  it('service foo --pod', function() {
    var args = ['service', 'foo', '--pod'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/foo/service.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain('export default Ember.Service.extend({\n});');

        expect(_file('tests/unit/foo/service-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('service:foo'");
      }));
  });

  it('service foo/bar --pod', function() {
    var args = ['service', 'foo/bar', '--pod'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/foo/bar/service.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain('export default Ember.Service.extend({\n});');

        expect(_file('tests/unit/foo/bar/service-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('service:foo/bar'");
      }));
  });

  it('service foo --pod podModulePrefix', function() {
    var args = ['service', 'foo', '--pod'];

    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/pods/foo/service.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain('export default Ember.Service.extend({\n});');

        expect(_file('tests/unit/pods/foo/service-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('service:foo'");
      }));
  });

  it('service foo/bar --pod podModulePrefix', function() {
    var args = ['service', 'foo/bar', '--pod'];

    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/pods/foo/bar/service.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain('export default Ember.Service.extend({\n});');

        expect(_file('tests/unit/pods/foo/bar/service-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('service:foo/bar'");
      }));
  });

  it('service-test foo', function() {
    var args = ['service-test', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/services/foo-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('service:foo'");
      }));
  });

  it('in-addon service-test foo', function() {
    var args = ['service-test', 'foo'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/services/foo-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('service:foo'");

        expect(_file('app/service-test/foo.js'))
          .to.not.exist;
      }));
  });

  it('service-test foo for mocha', function() {
    var args = ['service-test', 'foo'];

    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => generateFakePackageManifest('ember-cli-mocha', '0.11.0'))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/services/foo-test.js'))
          .to.contain("import { describeModule, it } from 'ember-mocha';")
          .to.contain("describeModule('service:foo', 'Unit | Service | foo'");
      }));
  });

  it('service-test foo for mocha v0.12+', function() {
    var args = ['service-test', 'foo'];

    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => generateFakePackageManifest('ember-cli-mocha', '0.12.0'))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/services/foo-test.js'))
          .to.contain("import { describe, it } from 'mocha';")
          .to.contain("import { setupTest } from 'ember-mocha';")
          .to.contain("describe('Unit | Service | foo', function() {")
          .to.contain("setupTest('service:foo',");
      }));
  });
});
