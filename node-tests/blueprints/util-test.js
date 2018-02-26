'use strict';

var blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
var setupTestHooks = blueprintHelpers.setupTestHooks;
var emberNew = blueprintHelpers.emberNew;
var emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
var modifyPackages = blueprintHelpers.modifyPackages;
var setupPodConfig = blueprintHelpers.setupPodConfig;

var chai = require('ember-cli-blueprint-test-helpers/chai');
var expect = chai.expect;

describe('Acceptance: ember generate and destroy util', function() {
  setupTestHooks(this);

  it('util foo-bar', function() {
    var args = ['util', 'foo-bar'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/utils/foo-bar.js'))
          .to.contain('export default function fooBar() {\n' +
                      '  return true;\n' +
                      '}');

        expect(_file('tests/unit/utils/foo-bar-test.js'))
          .to.contain("import fooBar from 'my-app/utils/foo-bar';");
      }));
  });

  it('util foo-bar/baz', function() {
    var args = ['util', 'foo/bar-baz'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/utils/foo/bar-baz.js'))
          .to.contain('export default function fooBarBaz() {\n' +
                      '  return true;\n' +
                      '}');

        expect(_file('tests/unit/utils/foo/bar-baz-test.js'))
          .to.contain("import fooBarBaz from 'my-app/utils/foo/bar-baz';");
      }));
  });

  it('in-addon util foo-bar', function() {
    var args = ['util', 'foo-bar'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('addon/utils/foo-bar.js'))
          .to.contain('export default function fooBar() {\n' +
                      '  return true;\n' +
                      '}');

        expect(_file('app/utils/foo-bar.js'))
          .to.contain("export { default } from 'my-addon/utils/foo-bar';");

        expect(_file('tests/unit/utils/foo-bar-test.js'))
          .to.contain("import fooBar from 'dummy/utils/foo-bar';");
      }));
  });

  it('in-addon util foo-bar/baz', function() {
    var args = ['util', 'foo/bar-baz'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('addon/utils/foo/bar-baz.js'))
          .to.contain('export default function fooBarBaz() {\n' +
                      '  return true;\n' +
                      '}');

        expect(_file('app/utils/foo/bar-baz.js'))
          .to.contain("export { default } from 'my-addon/utils/foo/bar-baz';");

        expect(_file('tests/unit/utils/foo/bar-baz-test.js'))
          .to.contain("import fooBarBaz from 'dummy/utils/foo/bar-baz';");
      }));
  });

  it('util foo-bar --pod', function() {
    var args = ['util', 'foo-bar', '--pod'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/utils/foo-bar.js'))
          .to.contain('export default function fooBar() {\n' +
                      '  return true;\n' +
                      '}');

        expect(_file('tests/unit/utils/foo-bar-test.js'))
          .to.contain("import fooBar from 'my-app/utils/foo-bar';");
      }));
  });

  it('util foo-bar --pod podModulePrefix', function() {
    var args = ['util', 'foo-bar', '--pod'];

    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/utils/foo-bar.js'))
          .to.contain('export default function fooBar() {\n' +
                      '  return true;\n' +
                      '}');

        expect(_file('tests/unit/utils/foo-bar-test.js'))
          .to.contain("import fooBar from 'my-app/utils/foo-bar';");
      }));
  });

  it('util foo-bar/baz --pod', function() {
    var args = ['util', 'foo/bar-baz', '--pod'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/utils/foo/bar-baz.js'))
          .to.contain('export default function fooBarBaz() {\n' +
                      '  return true;\n' +
                      '}');

        expect(_file('tests/unit/utils/foo/bar-baz-test.js'))
          .to.contain("import fooBarBaz from 'my-app/utils/foo/bar-baz';");
      }));
  });

  it('util-test foo-bar', function() {
    var args = ['util-test', 'foo-bar'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/utils/foo-bar-test.js'))
          .to.contain("import fooBar from 'my-app/utils/foo-bar';");
      }));
  });

  it('in-addon util-test foo-bar', function() {
    var args = ['util-test', 'foo-bar'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/utils/foo-bar-test.js'))
          .to.contain("import fooBar from 'dummy/utils/foo-bar';");
      }));
  });

  it('util-test foo-bar for mocha', function() {
    var args = ['util-test', 'foo-bar'];

    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/utils/foo-bar-test.js'))
          .to.contain("import { describe, it } from 'mocha';")
          .to.contain("import fooBar from 'my-app/utils/foo-bar';")
          .to.contain("describe('Unit | Utility | foo bar', function() {");
      }));
  });
});
