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

describe('Blueprint: util', function() {
  setupTestHooks(this);

  describe('in app', function() {
    beforeEach(function() {
      return emberNew();
    });

    it('util foo-bar', function() {
      return emberGenerateDestroy(['util', 'foo-bar'], _file => {
        expect(_file('app/utils/foo-bar.js')).to.contain(
          'export default function fooBar() {\n' + '  return true;\n' + '}'
        );

        expect(_file('tests/unit/utils/foo-bar-test.js')).to.contain(
          "import fooBar from 'my-app/utils/foo-bar';"
        );
      });
    });

    it('util foo-bar/baz', function() {
      return emberGenerateDestroy(['util', 'foo/bar-baz'], _file => {
        expect(_file('app/utils/foo/bar-baz.js')).to.contain(
          'export default function fooBarBaz() {\n' + '  return true;\n' + '}'
        );

        expect(_file('tests/unit/utils/foo/bar-baz-test.js')).to.contain(
          "import fooBarBaz from 'my-app/utils/foo/bar-baz';"
        );
      });
    });

    it('util foo-bar --pod', function() {
      return emberGenerateDestroy(['util', 'foo-bar', '--pod'], _file => {
        expect(_file('app/utils/foo-bar.js')).to.contain(
          'export default function fooBar() {\n' + '  return true;\n' + '}'
        );

        expect(_file('tests/unit/utils/foo-bar-test.js')).to.contain(
          "import fooBar from 'my-app/utils/foo-bar';"
        );
      });
    });

    it('util foo-bar/baz --pod', function() {
      return emberGenerateDestroy(['util', 'foo/bar-baz', '--pod'], _file => {
        expect(_file('app/utils/foo/bar-baz.js')).to.contain(
          'export default function fooBarBaz() {\n' + '  return true;\n' + '}'
        );

        expect(_file('tests/unit/utils/foo/bar-baz-test.js')).to.contain(
          "import fooBarBaz from 'my-app/utils/foo/bar-baz';"
        );
      });
    });

    describe('with podModulePrefix', function() {
      beforeEach(function() {
        return setupPodConfig({ podModulePrefix: true });
      });

      it('util foo-bar --pod', function() {
        return emberGenerateDestroy(['util', 'foo-bar', '--pod'], _file => {
          expect(_file('app/utils/foo-bar.js')).to.contain(
            'export default function fooBar() {\n' + '  return true;\n' + '}'
          );

          expect(_file('tests/unit/utils/foo-bar-test.js')).to.contain(
            "import fooBar from 'my-app/utils/foo-bar';"
          );
        });
      });
    });
  });

  describe('in app - module unification', function() {
    beforeEach(function() {
      return emberNew().then(() => fs.ensureDirSync('src'));
    });

    it('util foo-bar', function() {
      return emberGenerateDestroy(['util', 'foo-bar'], _file => {
        expect(_file('src/utils/foo-bar.js')).to.contain(
          'export default function fooBar() {\n' + '  return true;\n' + '}'
        );

        expect(_file('src/utils/foo-bar-test.js')).to.contain(
          "import fooBar from 'my-app/utils/foo-bar';"
        );
      });
    });

    it('util foo-bar/baz', function() {
      return emberGenerateDestroy(['util', 'foo/bar-baz'], _file => {
        expect(_file('src/utils/foo/bar-baz.js')).to.contain(
          'export default function fooBarBaz() {\n' + '  return true;\n' + '}'
        );

        expect(_file('src/utils/foo/bar-baz-test.js')).to.contain(
          "import fooBarBaz from 'my-app/utils/foo/bar-baz';"
        );
      });
    });

    it('util foo-bar --pod', function() {
      return expectError(
        emberGenerateDestroy(['util', 'foo-bar', '--pod']),
        "Pods aren't supported within a module unification app"
      );
    });
  });

  describe('in addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' });
    });

    it('util foo-bar', function() {
      return emberGenerateDestroy(['util', 'foo-bar'], _file => {
        expect(_file('addon/utils/foo-bar.js')).to.contain(
          'export default function fooBar() {\n' + '  return true;\n' + '}'
        );

        expect(_file('app/utils/foo-bar.js')).to.contain(
          "export { default } from 'my-addon/utils/foo-bar';"
        );

        expect(_file('tests/unit/utils/foo-bar-test.js')).to.contain(
          "import fooBar from 'dummy/utils/foo-bar';"
        );
      });
    });

    it('util foo-bar/baz', function() {
      return emberGenerateDestroy(['util', 'foo/bar-baz'], _file => {
        expect(_file('addon/utils/foo/bar-baz.js')).to.contain(
          'export default function fooBarBaz() {\n' + '  return true;\n' + '}'
        );

        expect(_file('app/utils/foo/bar-baz.js')).to.contain(
          "export { default } from 'my-addon/utils/foo/bar-baz';"
        );

        expect(_file('tests/unit/utils/foo/bar-baz-test.js')).to.contain(
          "import fooBarBaz from 'dummy/utils/foo/bar-baz';"
        );
      });
    });
  });

  describe('in addon - module unification', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' }).then(() => fs.ensureDirSync('src'));
    });

    it('util foo-bar', function() {
      return emberGenerateDestroy(['util', 'foo-bar'], _file => {
        expect(_file('src/utils/foo-bar.js')).to.contain(
          'export default function fooBar() {\n' + '  return true;\n' + '}'
        );

        expect(_file('src/utils/foo-bar-test.js')).to.contain(
          "import fooBar from 'dummy/utils/foo-bar';"
        );

        expect(_file('app/utils/foo-bar.js')).to.not.exist;
      });
    });

    it('util foo-bar/baz', function() {
      return emberGenerateDestroy(['util', 'foo/bar-baz'], _file => {
        expect(_file('src/utils/foo/bar-baz.js')).to.contain(
          'export default function fooBarBaz() {\n' + '  return true;\n' + '}'
        );

        expect(_file('src/utils/foo/bar-baz-test.js')).to.contain(
          "import fooBarBaz from 'dummy/utils/foo/bar-baz';"
        );

        expect(_file('app/utils/foo/bar-baz.js')).to.not.exist;
      });
    });
  });

  describe('in in-repo-addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'in-repo-addon' });
    });

    it('util foo --in-repo-addon=my-addon', function() {
      return emberGenerateDestroy(['util', 'foo', '--in-repo-addon=my-addon'], _file => {
        expect(_file('lib/my-addon/addon/utils/foo.js')).to.contain(
          'export default function foo() {\n' + '  return true;\n' + '}'
        );

        expect(_file('lib/my-addon/app/utils/foo.js')).to.contain(
          "export { default } from 'my-addon/utils/foo';"
        );

        expect(_file('tests/unit/utils/foo-test.js'))
          .to.contain("import foo from 'my-app/utils/foo';")
          .to.contain("import { module, test } from 'qunit';")
          .to.contain("module('Unit | Utility | foo');");
      });
    });

    it('util foo/bar --in-repo-addon=my-addon', function() {
      return emberGenerateDestroy(['util', 'foo/bar', '--in-repo-addon=my-addon'], _file => {
        expect(_file('lib/my-addon/addon/utils/foo/bar.js')).to.contain(
          'export default function fooBar() {\n' + '  return true;\n' + '}'
        );

        expect(_file('lib/my-addon/app/utils/foo/bar.js')).to.contain(
          "export { default } from 'my-addon/utils/foo/bar';"
        );

        expect(_file('tests/unit/utils/foo/bar-test.js'))
          .to.contain("import fooBar from 'my-app/utils/foo/bar';")
          .to.contain("import { module, test } from 'qunit';")
          .to.contain("module('Unit | Utility | foo/bar');");
      });
    });
  });
});
