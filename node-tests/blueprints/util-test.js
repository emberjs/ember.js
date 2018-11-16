'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const emberGenerate = blueprintHelpers.emberGenerate;
const setupPodConfig = blueprintHelpers.setupPodConfig;
const expectError = require('../helpers/expect-error');

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

const generateFakePackageManifest = require('../helpers/generate-fake-package-manifest');
const fixture = require('../helpers/fixture');

describe('Blueprint: util', function() {
  setupTestHooks(this);

  describe('in app', function() {
    beforeEach(function() {
      return emberNew().then(() => generateFakePackageManifest('ember-cli-qunit', '4.1.0'));
    });

    it('util foo-bar', function() {
      return emberGenerateDestroy(['util', 'foo-bar'], _file => {
        expect(_file('app/utils/foo-bar.js')).to.equal(fixture('util/util.js'));

        expect(_file('tests/unit/utils/foo-bar-test.js')).to.equal(fixture('util-test/rfc232.js'));
      });
    });

    it('util foo/bar-baz', function() {
      return emberGenerateDestroy(['util', 'foo/bar-baz'], _file => {
        expect(_file('app/utils/foo/bar-baz.js')).to.equal(fixture('util/util-nested.js'));

        expect(_file('tests/unit/utils/foo/bar-baz-test.js')).to.equal(
          fixture('util-test/rfc232-nested.js')
        );
      });
    });

    it('util foo-bar --pod', function() {
      return emberGenerateDestroy(['util', 'foo-bar', '--pod'], _file => {
        expect(_file('app/utils/foo-bar.js')).to.equal(fixture('util/util.js'));

        expect(_file('tests/unit/utils/foo-bar-test.js')).to.equal(fixture('util-test/rfc232.js'));
      });
    });

    it('util foo/bar-baz --pod', function() {
      return emberGenerateDestroy(['util', 'foo/bar-baz', '--pod'], _file => {
        expect(_file('app/utils/foo/bar-baz.js')).to.equal(fixture('util/util-nested.js'));

        expect(_file('tests/unit/utils/foo/bar-baz-test.js')).to.equal(
          fixture('util-test/rfc232-nested.js')
        );
      });
    });

    describe('with podModulePrefix', function() {
      beforeEach(function() {
        return setupPodConfig({ podModulePrefix: true });
      });

      it('util foo-bar --pod', function() {
        return emberGenerateDestroy(['util', 'foo-bar', '--pod'], _file => {
          expect(_file('app/utils/foo-bar.js')).to.equal(fixture('util/util.js'));

          expect(_file('tests/unit/utils/foo-bar-test.js')).to.equal(
            fixture('util-test/rfc232.js')
          );
        });
      });
    });
  });

  describe('in app - module unification', function() {
    beforeEach(function() {
      return emberNew({ isModuleUnification: true }).then(() =>
        generateFakePackageManifest('ember-cli-qunit', '4.1.0')
      );
    });

    it('util foo-bar', function() {
      return emberGenerateDestroy(
        ['util', 'foo-bar'],
        _file => {
          expect(_file('src/utils/foo-bar.js')).to.equal(fixture('util/util.js'));

          expect(_file('src/utils/foo-bar-test.js')).to.equal(fixture('util-test/rfc232.js'));
        },
        { isModuleUnification: true }
      );
    });

    it('util foo/bar-baz', function() {
      return emberGenerateDestroy(
        ['util', 'foo/bar-baz'],
        _file => {
          expect(_file('src/utils/foo/bar-baz.js')).to.equal(fixture('util/util-nested.js'));

          expect(_file('src/utils/foo/bar-baz-test.js')).to.equal(
            fixture('util-test/rfc232-nested.js')
          );
        },
        { isModuleUnification: true }
      );
    });

    it('util foo-bar --pod', function() {
      return expectError(
        emberGenerate(['util', 'foo-bar', '--pod'], { isModuleUnification: true }),
        "Pods aren't supported within a module unification app"
      );
    });
  });

  describe('in addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' }).then(() =>
        generateFakePackageManifest('ember-cli-qunit', '4.1.0')
      );
    });

    it('util foo-bar', function() {
      return emberGenerateDestroy(['util', 'foo-bar'], _file => {
        expect(_file('addon/utils/foo-bar.js')).to.equal(fixture('util/util.js'));

        expect(_file('app/utils/foo-bar.js')).to.contain(
          "export { default } from 'my-addon/utils/foo-bar';"
        );

        expect(_file('tests/unit/utils/foo-bar-test.js')).to.equal(
          fixture('util-test/addon-rfc232.js')
        );
      });
    });

    it('util foo/bar-baz', function() {
      return emberGenerateDestroy(['util', 'foo/bar-baz'], _file => {
        expect(_file('addon/utils/foo/bar-baz.js')).to.equal(fixture('util/util-nested.js'));

        expect(_file('app/utils/foo/bar-baz.js')).to.contain(
          "export { default } from 'my-addon/utils/foo/bar-baz';"
        );

        expect(_file('tests/unit/utils/foo/bar-baz-test.js')).to.equal(
          fixture('util-test/addon-rfc232-nested.js')
        );
      });
    });
  });

  describe('in addon - module unification', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon', isModuleUnification: true }).then(() =>
        generateFakePackageManifest('ember-cli-qunit', '4.1.0')
      );
    });

    it('util foo-bar', function() {
      return emberGenerateDestroy(
        ['util', 'foo-bar'],
        _file => {
          expect(_file('src/utils/foo-bar.js')).to.equal(fixture('util/util.js'));

          expect(_file('src/utils/foo-bar-test.js')).to.equal(fixture('util-test/dummy.js'));

          expect(_file('app/utils/foo-bar.js')).to.not.exist;
        },
        { isModuleUnification: true }
      );
    });
    it('util foo-bar/baz', function() {
      return emberGenerateDestroy(
        ['util', 'foo/bar-baz'],
        _file => {
          expect(_file('src/utils/foo/bar-baz.js')).to.equal(fixture('util/util-nested.js'));

          expect(_file('src/utils/foo/bar-baz-test.js')).to.equal(
            fixture('util-test/dummy-nested.js')
          );

          expect(_file('app/utils/foo/bar-baz.js')).to.not.exist;
        },
        { isModuleUnification: true }
      );
    });
  });

  describe('in in-repo-addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'in-repo-addon' }).then(() =>
        generateFakePackageManifest('ember-cli-qunit', '4.1.0')
      );
    });

    it('util foo-bar --in-repo-addon=my-addon', function() {
      return emberGenerateDestroy(['util', 'foo-bar', '--in-repo-addon=my-addon'], _file => {
        expect(_file('lib/my-addon/addon/utils/foo-bar.js')).to.equal(fixture('util/util.js'));

        expect(_file('lib/my-addon/app/utils/foo-bar.js')).to.contain(
          "export { default } from 'my-addon/utils/foo-bar';"
        );

        expect(_file('tests/unit/utils/foo-bar-test.js')).to.equal(fixture('util-test/rfc232.js'));
      });
    });

    it('util foo/bar-baz --in-repo-addon=my-addon', function() {
      return emberGenerateDestroy(['util', 'foo/bar-baz', '--in-repo-addon=my-addon'], _file => {
        expect(_file('lib/my-addon/addon/utils/foo/bar-baz.js')).to.equal(
          fixture('util/util-nested.js')
        );

        expect(_file('lib/my-addon/app/utils/foo/bar-baz.js')).to.contain(
          "export { default } from 'my-addon/utils/foo/bar-baz';"
        );

        expect(_file('tests/unit/utils/foo/bar-baz-test.js')).to.equal(
          fixture('util-test/rfc232-nested.js')
        );
      });
    });
  });
});
