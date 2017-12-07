'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const setupPodConfig = blueprintHelpers.setupPodConfig;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

describe('Blueprint: util', function() {
  setupTestHooks(this);

  describe('in app', function() {
    beforeEach(function() {
      return emberNew();
    });

    it('util foo-bar', function() {
      return emberGenerateDestroy(['util', 'foo-bar'], _file => {
        expect(_file('app/utils/foo-bar.js'))
          .to.contain('export default function fooBar() {\n' +
                      '  return true;\n' +
                      '}');

        expect(_file('tests/unit/utils/foo-bar-test.js'))
          .to.contain("import fooBar from 'my-app/utils/foo-bar';");
      });
    });

    it('util foo-bar/baz', function() {
      return emberGenerateDestroy(['util', 'foo/bar-baz'], _file => {
        expect(_file('app/utils/foo/bar-baz.js'))
          .to.contain('export default function fooBarBaz() {\n' +
                      '  return true;\n' +
                      '}');

        expect(_file('tests/unit/utils/foo/bar-baz-test.js'))
          .to.contain("import fooBarBaz from 'my-app/utils/foo/bar-baz';");
      });
    });

    it('util foo-bar --pod', function() {
      return emberGenerateDestroy(['util', 'foo-bar', '--pod'], _file => {
        expect(_file('app/utils/foo-bar.js'))
          .to.contain('export default function fooBar() {\n' +
                      '  return true;\n' +
                      '}');

        expect(_file('tests/unit/utils/foo-bar-test.js'))
          .to.contain("import fooBar from 'my-app/utils/foo-bar';");
      });
    });

    it('util foo-bar/baz --pod', function() {
      return emberGenerateDestroy(['util', 'foo/bar-baz', '--pod'], _file => {
        expect(_file('app/utils/foo/bar-baz.js'))
          .to.contain('export default function fooBarBaz() {\n' +
                      '  return true;\n' +
                      '}');

        expect(_file('tests/unit/utils/foo/bar-baz-test.js'))
          .to.contain("import fooBarBaz from 'my-app/utils/foo/bar-baz';");
      });
    });

    describe('with podModulePrefix', function() {
      beforeEach(function() {
        return setupPodConfig({ podModulePrefix: true });
      });

      it('util foo-bar --pod', function() {
        return emberGenerateDestroy(['util', 'foo-bar', '--pod'], _file => {
          expect(_file('app/utils/foo-bar.js'))
            .to.contain('export default function fooBar() {\n' +
                        '  return true;\n' +
                        '}');

          expect(_file('tests/unit/utils/foo-bar-test.js'))
            .to.contain("import fooBar from 'my-app/utils/foo-bar';");
        });
      });
    });
  });

  describe('in addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' });
    });

    it('util foo-bar', function() {
      return emberGenerateDestroy(['util', 'foo-bar'], _file => {
        expect(_file('addon/utils/foo-bar.js'))
          .to.contain('export default function fooBar() {\n' +
          '  return true;\n' +
          '}');

        expect(_file('app/utils/foo-bar.js'))
          .to.contain("export { default } from 'my-addon/utils/foo-bar';");

        expect(_file('tests/unit/utils/foo-bar-test.js'))
          .to.contain("import fooBar from 'dummy/utils/foo-bar';");
      });
    });

    it('util foo-bar/baz', function() {
      return emberGenerateDestroy(['util', 'foo/bar-baz'], _file => {
        expect(_file('addon/utils/foo/bar-baz.js'))
          .to.contain('export default function fooBarBaz() {\n' +
          '  return true;\n' +
          '}');

        expect(_file('app/utils/foo/bar-baz.js'))
          .to.contain("export { default } from 'my-addon/utils/foo/bar-baz';");

        expect(_file('tests/unit/utils/foo/bar-baz-test.js'))
          .to.contain("import fooBarBaz from 'dummy/utils/foo/bar-baz';");
      });
    });
  });
});
