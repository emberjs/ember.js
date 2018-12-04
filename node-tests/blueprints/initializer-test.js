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

const generateFakePackageManifest = require('../helpers/generate-fake-package-manifest');
const enableModuleUnification = require('../helpers/module-unification').enableModuleUnification;
const fixture = require('../helpers/fixture');

describe('Blueprint: initializer', function() {
  setupTestHooks(this);

  describe('in app', function() {
    beforeEach(function() {
      return emberNew().then(() => generateFakePackageManifest('ember-cli-qunit', '4.1.0'));
    });

    it('initializer foo', function() {
      return emberGenerateDestroy(['initializer', 'foo'], _file => {
        expect(_file('app/initializers/foo.js')).to.equal(fixture('initializer/initializer.js'));

        expect(_file('tests/unit/initializers/foo-test.js')).to.contain(
          "import { initialize } from 'my-app/initializers/foo';"
        );
      });
    });

    it('initializer foo/bar', function() {
      return emberGenerateDestroy(['initializer', 'foo/bar'], _file => {
        expect(_file('app/initializers/foo/bar.js')).to.equal(
          fixture('initializer/initializer-nested.js')
        );

        expect(_file('tests/unit/initializers/foo/bar-test.js')).to.contain(
          "import { initialize } from 'my-app/initializers/foo/bar';"
        );
      });
    });

    it('initializer foo --pod', function() {
      return emberGenerateDestroy(['initializer', 'foo', '--pod'], _file => {
        expect(_file('app/initializers/foo.js')).to.equal(fixture('initializer/initializer.js'));
      });
    });

    it('initializer foo/bar --pod', function() {
      return emberGenerateDestroy(['initializer', 'foo/bar', '--pod'], _file => {
        expect(_file('app/initializers/foo/bar.js')).to.equal(
          fixture('initializer/initializer-nested.js')
        );
      });
    });

    describe('with podModulePrefix', function() {
      beforeEach(function() {
        setupPodConfig({ podModulePrefix: true });
      });

      it('initializer foo --pod', function() {
        return emberGenerateDestroy(['initializer', 'foo', '--pod'], _file => {
          expect(_file('app/initializers/foo.js')).to.equal(fixture('initializer/initializer.js'));
        });
      });

      it('initializer foo/bar --pod', function() {
        return emberGenerateDestroy(['initializer', 'foo/bar', '--pod'], _file => {
          expect(_file('app/initializers/foo/bar.js')).to.equal(
            fixture('initializer/initializer-nested.js')
          );
        });
      });
    });
  });

  describe('in addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' }).then(() =>
        generateFakePackageManifest('ember-cli-qunit', '4.1.0')
      );
    });

    it('initializer foo', function() {
      return emberGenerateDestroy(['initializer', 'foo'], _file => {
        expect(_file('addon/initializers/foo.js')).to.equal(fixture('initializer/initializer.js'));

        expect(_file('app/initializers/foo.js')).to.contain(
          "export { default, initialize } from 'my-addon/initializers/foo';"
        );

        expect(_file('tests/unit/initializers/foo-test.js')).to.exist;
      });
    });

    it('initializer foo/bar', function() {
      return emberGenerateDestroy(['initializer', 'foo/bar'], _file => {
        expect(_file('addon/initializers/foo/bar.js')).to.equal(
          fixture('initializer/initializer-nested.js')
        );

        expect(_file('app/initializers/foo/bar.js')).to.contain(
          "export { default, initialize } from 'my-addon/initializers/foo/bar';"
        );

        expect(_file('tests/unit/initializers/foo/bar-test.js')).to.exist;
      });
    });

    it('initializer foo --dummy', function() {
      return emberGenerateDestroy(['initializer', 'foo', '--dummy'], _file => {
        expect(_file('tests/dummy/app/initializers/foo.js')).to.equal(
          fixture('initializer/initializer.js')
        );

        expect(_file('app/initializers/foo.js')).to.not.exist;

        expect(_file('tests/unit/initializers/foo-test.js')).to.not.exist;
      });
    });

    it('initializer foo/bar --dummy', function() {
      return emberGenerateDestroy(['initializer', 'foo/bar', '--dummy'], _file => {
        expect(_file('tests/dummy/app/initializers/foo/bar.js')).to.equal(
          fixture('initializer/initializer-nested.js')
        );

        expect(_file('app/initializers/foo/bar.js')).to.not.exist;

        expect(_file('tests/unit/initializers/foo/bar-test.js')).to.not.exist;
      });
    });
  });

  describe('in in-repo-addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'in-repo-addon' }).then(() =>
        generateFakePackageManifest('ember-cli-qunit', '4.1.0')
      );
    });

    it('initializer foo --in-repo-addon=my-addon', function() {
      return emberGenerateDestroy(['initializer', 'foo', '--in-repo-addon=my-addon'], _file => {
        expect(_file('lib/my-addon/addon/initializers/foo.js')).to.equal(
          fixture('initializer/initializer.js')
        );

        expect(_file('lib/my-addon/app/initializers/foo.js')).to.contain(
          "export { default, initialize } from 'my-addon/initializers/foo';"
        );

        expect(_file('tests/unit/initializers/foo-test.js')).to.exist;
      });
    });

    it('initializer foo/bar --in-repo-addon=my-addon', function() {
      return emberGenerateDestroy(['initializer', 'foo/bar', '--in-repo-addon=my-addon'], _file => {
        expect(_file('lib/my-addon/addon/initializers/foo/bar.js')).to.equal(
          fixture('initializer/initializer-nested.js')
        );

        expect(_file('lib/my-addon/app/initializers/foo/bar.js')).to.contain(
          "export { default, initialize } from 'my-addon/initializers/foo/bar';"
        );

        expect(_file('tests/unit/initializers/foo/bar-test.js')).to.exist;
      });
    });
  });

  describe('in app – module unification', function() {
    enableModuleUnification();

    beforeEach(function() {
      return emberNew()
        .then(() => fs.ensureDirSync('src'))
        .then(() => generateFakePackageManifest('ember-cli-qunit', '4.1.0'));
    });

    it('initializer foo', function() {
      return emberGenerateDestroy(['initializer', 'foo'], _file => {
        expect(_file('src/init/initializers/foo.js')).to.equal(
          fixture('initializer/initializer.js')
        );

        expect(_file('src/init/initializers/foo-test.js')).to.contain(
          "import { initialize } from 'my-app/init/initializers/foo';"
        );
      });
    });

    it('initializer foo/bar', function() {
      return emberGenerateDestroy(['initializer', 'foo/bar'], _file => {
        expect(_file('src/init/initializers/foo/bar.js')).to.equal(
          fixture('initializer/initializer-nested.js')
        );

        expect(_file('src/init/initializers/foo/bar-test.js')).to.contain(
          "import { initialize } from 'my-app/init/initializers/foo/bar';"
        );
      });
    });

    it('initializer foo --pod', function() {
      return expectError(
        emberGenerateDestroy(['initializer', 'foo', '--pod']),
        'Pods arenʼt supported within a module unification app'
      );
    });

    it('initializer foo/bar --pod', function() {
      return expectError(
        emberGenerateDestroy(['initializer', 'foo/bar', '--pod']),
        'Pods arenʼt supported within a module unification app'
      );
    });

    describe('with podModulePrefix', function() {
      beforeEach(function() {
        setupPodConfig({ podModulePrefix: true });
      });

      it('initializer foo --pod', function() {
        return expectError(
          emberGenerateDestroy(['initializer', 'foo', '--pod']),
          'Pods arenʼt supported within a module unification app'
        );
      });

      it('initializer foo/bar --pod', function() {
        return expectError(
          emberGenerateDestroy(['initializer', 'foo/bar', '--pod']),
          'Pods arenʼt supported within a module unification app'
        );
      });
    });
  });

  describe('in addon – module unification', function() {
    enableModuleUnification();

    beforeEach(function() {
      return emberNew({ target: 'addon' })
        .then(() => fs.ensureDirSync('src'))
        .then(() => generateFakePackageManifest('ember-cli-qunit', '4.1.0'));
    });

    it('initializer foo', function() {
      return emberGenerateDestroy(['initializer', 'foo'], _file => {
        expect(_file('src/init/initializers/foo.js')).to.equal(
          fixture('initializer/initializer.js')
        );

        expect(_file('src/init/initializers/foo-test.js')).to.contain(
          "import { initialize } from 'dummy/init/initializers/foo';"
        );
      });
    });

    it('initializer foo/bar', function() {
      return emberGenerateDestroy(['initializer', 'foo/bar'], _file => {
        expect(_file('src/init/initializers/foo/bar.js')).to.equal(
          fixture('initializer/initializer-nested.js')
        );

        expect(_file('src/init/initializers/foo/bar-test.js')).to.contain(
          "import { initialize } from 'dummy/init/initializers/foo/bar';"
        );
      });
    });

    it('initializer foo --dummy', function() {
      return emberGenerateDestroy(['initializer', 'foo', '--dummy'], _file => {
        expect(_file('tests/dummy/src/init/initializers/foo.js')).to.equal(
          fixture('initializer/initializer.js')
        );

        expect(_file('src/init/initializers/foo.js')).to.not.exist;
        expect(_file('src/init/initializers/foo-test.js')).to.not.exist;
      });
    });

    it('initializer foo/bar --dummy', function() {
      return emberGenerateDestroy(['initializer', 'foo/bar', '--dummy'], _file => {
        expect(_file('tests/dummy/src/init/initializers/foo/bar.js')).to.equal(
          fixture('initializer/initializer-nested.js')
        );

        expect(_file('src/init/initializers/foo/bar.js')).to.not.exist;
        expect(_file('src/init/initializers/foo/bar-test.js')).to.not.exist;
      });
    });
  });
});
