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
const file = require('../helpers/file');

describe('Acceptance: ember generate and destroy helper', function() {
  setupTestHooks(this);

  it('helper foo/bar-baz', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['helper', 'foo/bar-baz'], _file => {
        expect(_file('app/helpers/foo/bar-baz.js'))
          .to.equal(file('helper.js'));
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js'))
          .to.equal(file('helper-test/integration.js'));
      }));
  });

  it('helper foo/bar-baz unit', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['helper', '--test-type=unit', 'foo/bar-baz'], _file => {
        expect(_file('app/helpers/foo/bar-baz.js'))
          .to.equal(file('helper.js'));
        expect(_file('tests/unit/helpers/foo/bar-baz-test.js'))
          .to.equal(file('helper-test/unit.js'));
      }));
  });

  it('in-addon helper foo/bar-baz', function() {
    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(['helper', 'foo/bar-baz'], _file => {
        expect(_file('addon/helpers/foo/bar-baz.js'))
          .to.equal(file('helper.js'));
        expect(_file('app/helpers/foo/bar-baz.js'))
          .to.equal(file('helper-addon.js'));
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js'))
          .to.equal(file('helper-test/integration.js'));
      }));
  });

  it('in-addon helper foo/bar-baz', function() {
    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(['helper', 'foo/bar-baz'], _file => {
        expect(_file('addon/helpers/foo/bar-baz.js'))
          .to.equal(file('helper.js'));
        expect(_file('app/helpers/foo/bar-baz.js'))
          .to.equal(file('helper-addon.js'));
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js'))
          .to.equal(file('helper-test/integration.js'));
      }));
  });

  it('dummy helper foo/bar-baz', function() {
    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(['helper', 'foo/bar-baz', '--dummy'], _file => {
        expect(_file('tests/dummy/app/helpers/foo/bar-baz.js'))
          .to.equal(file('helper.js'));
        expect(_file('app/helpers/foo/bar-baz.js'))
          .to.not.exist;
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js'))
          .to.not.exist;
      }));
  });

  it('in-repo-addon helper foo/bar-baz', function() {
    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(['helper', 'foo/bar-baz', '--in-repo-addon=my-addon'], _file => {
        expect(_file('lib/my-addon/addon/helpers/foo/bar-baz.js'))
          .to.equal(file('helper.js'));
        expect(_file('lib/my-addon/app/helpers/foo/bar-baz.js'))
          .to.equal(file('helper-addon.js'));
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js'))
          .to.equal(file('helper-test/integration.js'));
      }));
  });

  it('in-repo-addon helper foo/bar-baz', function() {
    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(['helper', 'foo/bar-baz', '--in-repo-addon=my-addon'], _file => {
        expect(_file('lib/my-addon/addon/helpers/foo/bar-baz.js'))
          .to.equal(file('helper.js'));
        expect(_file('lib/my-addon/app/helpers/foo/bar-baz.js'))
          .to.equal(file('helper-addon.js'));
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js'))
          .to.equal(file('helper-test/integration.js'));
      }));
  });

  it('helper foo/bar-baz --pod', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['helper', 'foo/bar-baz', '--pod'], _file => {
        expect(_file('app/helpers/foo/bar-baz.js'))
          .to.equal(file('helper.js'));
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js'))
          .to.equal(file('helper-test/integration.js'));
      }));
  });

  it('helper foo/bar-baz --pod podModulePrefix', function() {
    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(['helper', 'foo/bar-baz', '--pod'], _file => {
        expect(_file('app/helpers/foo/bar-baz.js'))
          .to.equal(file('helper.js'));
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js'))
          .to.equal(file('helper-test/integration.js'));
      }));
  });

  it('helper foo/bar-baz --pod', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['helper', 'foo/bar-baz', '--pod'], _file => {
        expect(_file('app/helpers/foo/bar-baz.js'))
          .to.equal(file('helper.js'));
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js'))
          .to.equal(file('helper-test/integration.js'));
      }));
  });

  it('helper foo/bar-baz --pod podModulePrefix', function() {
    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(['helper', 'foo/bar-baz', '--pod'], _file => {
        expect(_file('app/helpers/foo/bar-baz.js'))
          .to.equal(file('helper.js'));
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js'))
          .to.equal(file('helper-test/integration.js'));
      }));
  });

  it('helper-test foo/bar-baz --integration', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['helper-test', 'foo/bar-baz', '--integration'], _file => {
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js'))
          .to.equal(file('helper-test/integration.js'));
      }));
  });

  it('helper-test foo/bar-baz', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['helper-test', 'foo/bar-baz'], _file => {
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js'))
          .to.equal(file('helper-test/integration.js'));
      }));
  });

  it('in-addon helper-test foo/bar-baz', function() {
    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(['helper-test', 'foo/bar-baz'], _file => {
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js'))
          .to.equal(file('helper-test/integration.js'));
      }));
  });

  it('helper-test foo/bar-baz --integration for mocha', function() {
    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => generateFakePackageManifest('ember-cli-mocha', '0.11.0'))
      .then(() => emberGenerateDestroy(['helper-test', 'foo/bar-baz', '--integration'], _file => {
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js'))
          .to.contain("import { describeComponent, it } from 'ember-mocha';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';");
      }));
  });

  it('helper-test foo/bar-baz --integration for mocha v0.12+', function() {
    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => generateFakePackageManifest('ember-cli-mocha', '0.12.0'))
      .then(() => emberGenerateDestroy(['helper-test', 'foo/bar-baz', '--integration'], _file => {
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js'))
          .to.contain("import { describe, it } from 'mocha';")
          .to.contain("import { setupComponentTest } from 'ember-mocha';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';")
          .to.contain("describe('Integration | Helper | foo/bar baz', function() {");
      }));
  });

  it('helper-test foo/bar-baz for mocha', function() {
    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => generateFakePackageManifest('ember-cli-mocha', '0.12.0'))
      .then(() => emberGenerateDestroy(['helper-test', 'foo/bar-baz'], _file => {
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js'))
          .to.contain("import { describe, it } from 'mocha';")
          .to.contain("setupComponentTest('foo/bar-baz', {")
          .to.contain("describe('Integration | Helper | foo/bar baz', function() {");
      }));
  });
});
