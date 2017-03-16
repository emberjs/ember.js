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

describe('Acceptance: ember generate and destroy helper', function() {
  setupTestHooks(this);

  it('helper foo/bar-baz', function() {
    var args = ['helper', 'foo/bar-baz'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/helpers/foo/bar-baz.js'))
          .to.contain("import Ember from 'ember';\n\n" +
                      "export function fooBarBaz(params/*, hash*/) {\n" +
                      "  return params;\n" +
                      "}\n\n" +
                      "export default Ember.Helper.helper(fooBarBaz);");

        expect(_file('tests/integration/helpers/foo/bar-baz-test.js'))
          .to.contain("moduleForComponent('foo/bar-baz', 'helper:foo/bar-baz', {");
      }));
  });

  it('in-addon helper foo-bar', function() {
    var args = ['helper', 'foo-bar'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('addon/helpers/foo-bar.js'))
          .to.contain("import Ember from 'ember';\n\n" +
                      "export function fooBar(params/*, hash*/) {\n" +
                      "  return params;\n" +
                      "}\n\n" +
                      "export default Ember.Helper.helper(fooBar);");

        expect(_file('app/helpers/foo-bar.js'))
          .to.contain("export { default, fooBar } from 'my-addon/helpers/foo-bar';");
        expect(_file('tests/integration/helpers/foo-bar-test.js'))
          .to.contain("moduleForComponent('foo-bar', 'helper:foo-bar', {");
      }));
  });

  it('in-addon helper foo/bar-baz', function() {
    var args = ['helper', 'foo/bar-baz'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('addon/helpers/foo/bar-baz.js'))
          .to.contain("import Ember from 'ember';\n\n" +
                      "export function fooBarBaz(params/*, hash*/) {\n" +
                      "  return params;\n" +
                      "}\n\n" +
                      "export default Ember.Helper.helper(fooBarBaz);");

        expect(_file('app/helpers/foo/bar-baz.js'))
          .to.contain("export { default, fooBarBaz } from 'my-addon/helpers/foo/bar-baz';");
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js'))
          .to.contain("moduleForComponent('foo/bar-baz', 'helper:foo/bar-baz', {");
      }));
  });

  it('dummy helper foo-bar', function() {
    var args = ['helper', 'foo-bar', '--dummy'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/dummy/app/helpers/foo-bar.js'))
          .to.contain("import Ember from 'ember';\n\n" +
                      "export function fooBar(params/*, hash*/) {\n" +
                      "  return params;\n" +
                      "}\n\n" +
                      "export default Ember.Helper.helper(fooBar);");

        expect(_file('app/helpers/foo-bar.js'))
          .to.not.exist;
        expect(_file('tests/integration/helpers/foo-bar-test.js'))
          .to.not.exist;
      }));
  });

  it('dummy helper foo/bar-baz', function() {
    var args = ['helper', 'foo/bar-baz', '--dummy'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/dummy/app/helpers/foo/bar-baz.js'))
          .to.contain("import Ember from 'ember';\n\n" +
                      "export function fooBarBaz(params/*, hash*/) {\n" +
                      "  return params;\n" +
                      "}\n\n" +
                      "export default Ember.Helper.helper(fooBarBaz);");

        expect(_file('app/helpers/foo/bar-baz.js'))
          .to.not.exist;
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js'))
          .to.not.exist;
      }));
  });

  it('in-repo-addon helper foo-bar', function() {
    var args = ['helper', 'foo-bar', '--in-repo-addon=my-addon'];

    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('lib/my-addon/addon/helpers/foo-bar.js'))
          .to.contain("import Ember from 'ember';\n\n" +
                      "export function fooBar(params/*, hash*/) {\n" +
                      "  return params;\n" +
                      "}\n\n" +
                      "export default Ember.Helper.helper(fooBar);");

        expect(_file('lib/my-addon/app/helpers/foo-bar.js'))
          .to.contain("export { default, fooBar } from 'my-addon/helpers/foo-bar';");
        expect(_file('tests/integration/helpers/foo-bar-test.js'))
          .to.contain("moduleForComponent('foo-bar', 'helper:foo-bar', {");
      }));
  });

  it('in-repo-addon helper foo/bar-baz', function() {
    var args = ['helper', 'foo/bar-baz', '--in-repo-addon=my-addon'];

    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('lib/my-addon/addon/helpers/foo/bar-baz.js'))
          .to.contain("import Ember from 'ember';\n\n" +
                      "export function fooBarBaz(params/*, hash*/) {\n" +
                      "  return params;\n" +
                      "}\n\n" +
                      "export default Ember.Helper.helper(fooBarBaz);");

        expect(_file('lib/my-addon/app/helpers/foo/bar-baz.js'))
          .to.contain("export { default, fooBarBaz } from 'my-addon/helpers/foo/bar-baz';");
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js'))
          .to.contain("moduleForComponent('foo/bar-baz', 'helper:foo/bar-baz', {");
      }));
  });

  it('helper foo-bar --pod', function() {
    var args = ['helper', 'foo-bar', '--pod'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/helpers/foo-bar.js'))
          .to.contain("import Ember from 'ember';\n\n" +
                      "export function fooBar(params/*, hash*/) {\n" +
                      "  return params;\n" +
                      "}\n\n" +
                      "export default Ember.Helper.helper(fooBar);");

        expect(_file('tests/integration/helpers/foo-bar-test.js'))
          .to.contain("moduleForComponent('foo-bar', 'helper:foo-bar', {");
      }));
  });

  it('helper foo-bar --pod podModulePrefix', function() {
    var args = ['helper', 'foo-bar', '--pod'];

    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/helpers/foo-bar.js'))
          .to.contain("import Ember from 'ember';\n\n" +
                      "export function fooBar(params/*, hash*/) {\n" +
                      "  return params;\n" +
                      "}\n\n" +
                      "export default Ember.Helper.helper(fooBar);");

        expect(_file('tests/integration/helpers/foo-bar-test.js'))
          .to.contain("moduleForComponent('foo-bar', 'helper:foo-bar', {");
      }));
  });

  it('helper foo/bar-baz --pod', function() {
    var args = ['helper', 'foo/bar-baz', '--pod'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/helpers/foo/bar-baz.js'))
          .to.contain("import Ember from 'ember';\n\n" +
                      "export function fooBarBaz(params/*, hash*/) {\n" +
                      "  return params;\n" +
                      "}\n\n" +
                      "export default Ember.Helper.helper(fooBarBaz);");

        expect(_file('tests/integration/helpers/foo/bar-baz-test.js'))
          .to.contain("moduleForComponent('foo/bar-baz', 'helper:foo/bar-baz', {");
      }));
  });

  it('helper foo/bar-baz --pod podModulePrefix', function() {
    var args = ['helper', 'foo/bar-baz', '--pod'];

    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/helpers/foo/bar-baz.js'))
          .to.contain("import Ember from 'ember';\n\n" +
                      "export function fooBarBaz(params/*, hash*/) {\n" +
                      "  return params;\n" +
                      "}\n\n" +
                      "export default Ember.Helper.helper(fooBarBaz);");

        expect(_file('tests/integration/helpers/foo/bar-baz-test.js'))
          .to.contain("moduleForComponent('foo/bar-baz', 'helper:foo/bar-baz', {");
      }));
  });

  it('helper-test foo/bar-baz --integration', function() {
    var args = ['helper-test', 'foo/bar-baz', '--integration'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js'))
          .to.contain("moduleForComponent('foo/bar-baz', 'helper:foo/bar-baz', {");
      }));
  });

  it('helper-test foo/bar-baz', function() {
    var args = ['helper-test', 'foo/bar-baz'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js'))
          .to.contain("moduleForComponent('foo/bar-baz', 'helper:foo/bar-baz', {");
      }));
  });

  it('in-addon helper-test foo-bar', function() {
    var args = ['helper-test', 'foo-bar'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/integration/helpers/foo-bar-test.js'))
          .to.contain("moduleForComponent('foo-bar', 'helper:foo-bar', {");
      }));
  });

  it('helper-test foo/bar-baz --integration for mocha', function() {
    var args = ['helper-test', 'foo/bar-baz', '--integration'];

    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => generateFakePackageManifest('ember-cli-mocha', '0.11.0'))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js'))
          .to.contain("import { describeComponent, it } from 'ember-mocha';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';");
      }));
  });

  it('helper-test foo/bar-baz --integration for mocha v0.12+', function() {
    var args = ['helper-test', 'foo/bar-baz', '--integration'];

    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => generateFakePackageManifest('ember-cli-mocha', '0.12.0'))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js'))
          .to.contain("import { describe, it } from 'mocha';")
          .to.contain("import { setupComponentTest } from 'ember-mocha';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';")
          .to.contain("describe('Integration | Helper | foo/bar baz', function() {");
      }));
  });

  it('helper-test foo/bar-baz for mocha', function() {
    var args = ['helper-test', 'foo/bar-baz'];

    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => generateFakePackageManifest('ember-cli-mocha', '0.12.0'))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js'))
          .to.contain("import { describe, it } from 'mocha';")
          .to.contain("setupComponentTest('foo/bar-baz', {")
          .to.contain("describe('Integration | Helper | foo/bar baz', function() {");
      }));
  });
});
