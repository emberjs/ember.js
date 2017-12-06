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

describe('Acceptance: ember generate and destroy controller', function() {
  setupTestHooks(this);

  it('controller foo', function() {
    let args = ['controller', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/controllers/foo.js'))
          .to.contain("import Controller from '@ember/controller';")
          .to.contain("export default Controller.extend({\n});");

        expect(_file('tests/unit/controllers/foo-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo'");
      }));
  });

  it('controller foo/bar', function() {
    let args = ['controller', 'foo/bar'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/controllers/foo/bar.js'))
          .to.contain("import Controller from '@ember/controller';")
          .to.contain("export default Controller.extend({\n});");

        expect(_file('tests/unit/controllers/foo/bar-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo/bar'");
      }));
  });

  it('in-addon controller foo', function() {
    let args = ['controller', 'foo'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('addon/controllers/foo.js'))
          .to.contain("import Controller from '@ember/controller';")
          .to.contain("export default Controller.extend({\n});");

        expect(_file('app/controllers/foo.js'))
          .to.contain("export { default } from 'my-addon/controllers/foo';");

        expect(_file('tests/unit/controllers/foo-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo'");
      }));
  });

  it('in-addon controller foo/bar', function() {
    let args = ['controller', 'foo/bar'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('addon/controllers/foo/bar.js'))
          .to.contain("import Controller from '@ember/controller';")
          .to.contain("export default Controller.extend({\n});");

        expect(_file('app/controllers/foo/bar.js'))
          .to.contain("export { default } from 'my-addon/controllers/foo/bar';");

        expect(_file('tests/unit/controllers/foo/bar-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo/bar'");
      }));
  });

  it('dummy controller foo', function() {
    let args = ['controller', 'foo', '--dummy'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/dummy/app/controllers/foo.js'))
          .to.contain("import Controller from '@ember/controller';")
          .to.contain("export default Controller.extend({\n});");

        expect(_file('app/controllers/foo-test.js'))
          .to.not.exist;

        expect(_file('tests/unit/controllers/foo-test.js'))
          .to.not.exist;
      }));
  });

  it('dummy controller foo/bar', function() {
    let args = ['controller', 'foo/bar', '--dummy'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/dummy/app/controllers/foo/bar.js'))
          .to.contain("import Controller from '@ember/controller';")
          .to.contain("export default Controller.extend({\n});");

        expect(_file('app/controllers/foo/bar.js'))
          .to.not.exist;

        expect(_file('tests/unit/controllers/foo/bar-test.js'))
          .to.not.exist;
      }));
  });

  it('in-repo-addon controller foo', function() {
    let args = ['controller', 'foo', '--in-repo-addon=my-addon'];

    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('lib/my-addon/addon/controllers/foo.js'))
          .to.contain("import Controller from '@ember/controller';")
          .to.contain("export default Controller.extend({\n});");

        expect(_file('lib/my-addon/app/controllers/foo.js'))
          .to.contain("export { default } from 'my-addon/controllers/foo';");

        expect(_file('tests/unit/controllers/foo-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo'");
      }));
  });

  it('in-repo-addon controller foo/bar', function() {
    let args = ['controller', 'foo/bar', '--in-repo-addon=my-addon'];

    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('lib/my-addon/addon/controllers/foo/bar.js'))
          .to.contain("import Controller from '@ember/controller';")
          .to.contain("export default Controller.extend({\n});");

        expect(_file('lib/my-addon/app/controllers/foo/bar.js'))
          .to.contain("export { default } from 'my-addon/controllers/foo/bar';");

        expect(_file('tests/unit/controllers/foo/bar-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo/bar'");
      }));
  });

  it('controller foo --pod', function() {
    let args = ['controller', 'foo', '--pod'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/foo/controller.js'))
          .to.contain("import Controller from '@ember/controller';")
          .to.contain("export default Controller.extend({\n});");

        expect(_file('tests/unit/foo/controller-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo'");
      }));
  });

  it('controller foo --pod podModulePrefix', function() {
    let args = ['controller', 'foo', '--pod'];

    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/pods/foo/controller.js'))
          .to.contain("import Controller from '@ember/controller';")
          .to.contain("export default Controller.extend({\n});");

        expect(_file('tests/unit/pods/foo/controller-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo'");
      }));
  });

  it('controller foo/bar --pod', function() {
    let args = ['controller', 'foo/bar', '--pod'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/foo/bar/controller.js'))
          .to.contain("import Controller from '@ember/controller';")
          .to.contain("export default Controller.extend({\n});");

        expect(_file('tests/unit/foo/bar/controller-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo/bar'");
      }));
  });

  it('controller foo/bar --pod podModulePrefix', function() {
    let args = ['controller', 'foo/bar', '--pod'];

    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/pods/foo/bar/controller.js'))
          .to.contain("import Controller from '@ember/controller';")
          .to.contain("export default Controller.extend({\n});");

        expect(_file('tests/unit/pods/foo/bar/controller-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo/bar'");
      }));
  });

  it('controller-test foo', function() {
    let args = ['controller-test', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/controllers/foo-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo'");
      }));
  });

  it('in-addon controller-test foo', function() {
    let args = ['controller-test', 'foo'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/controllers/foo-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo'");
      }));
  });

  it('controller-test foo for mocha', function() {
    let args = ['controller-test', 'foo'];

    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => generateFakePackageManifest('ember-cli-mocha', '0.11.0'))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/controllers/foo-test.js'))
          .to.contain("import { describeModule, it } from 'ember-mocha';")
          .to.contain("describeModule('controller:foo', 'Unit | Controller | foo'");
      }));
  });

  it('controller-test foo for mocha v0.12+', function() {
    let args = ['controller-test', 'foo'];

    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => generateFakePackageManifest('ember-cli-mocha', '0.12.0'))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/controllers/foo-test.js'))
          .to.contain("import { describe, it } from 'mocha';")
          .to.contain("import { setupTest } from 'ember-mocha';")
          .to.contain("describe('Unit | Controller | foo'")
          .to.contain("setupTest('controller:foo',");
      }));
  });
});
