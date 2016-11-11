'use strict';

var blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
var setupTestHooks = blueprintHelpers.setupTestHooks;
var emberNew = blueprintHelpers.emberNew;
var emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
var modifyPackages = blueprintHelpers.modifyPackages;
var setupPodConfig = blueprintHelpers.setupPodConfig;

var chai = require('ember-cli-blueprint-test-helpers/chai');
var expect = chai.expect;

describe('Acceptance: ember generate and destroy controller', function() {
  setupTestHooks(this);

  it('controller foo', function() {
    var args = ['controller', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/controllers/foo.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain("export default Ember.Controller.extend({\n});");

        expect(_file('tests/unit/controllers/foo-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo'");
      }));
  });

  it('controller foo/bar', function() {
    var args = ['controller', 'foo/bar'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/controllers/foo/bar.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain("export default Ember.Controller.extend({\n});");

        expect(_file('tests/unit/controllers/foo/bar-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo/bar'");
      }));
  });

  it('in-addon controller foo', function() {
    var args = ['controller', 'foo'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('addon/controllers/foo.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain("export default Ember.Controller.extend({\n});");

        expect(_file('app/controllers/foo.js'))
          .to.contain("export { default } from 'my-addon/controllers/foo';");

        expect(_file('tests/unit/controllers/foo-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo'");
      }));
  });

  it('in-addon controller foo/bar', function() {
    var args = ['controller', 'foo/bar'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('addon/controllers/foo/bar.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain("export default Ember.Controller.extend({\n});");

        expect(_file('app/controllers/foo/bar.js'))
          .to.contain("export { default } from 'my-addon/controllers/foo/bar';");

        expect(_file('tests/unit/controllers/foo/bar-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo/bar'");
      }));
  });

  it('dummy controller foo', function() {
    var args = ['controller', 'foo', '--dummy'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/dummy/app/controllers/foo.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain("export default Ember.Controller.extend({\n});");

        expect(_file('app/controllers/foo-test.js'))
          .to.not.exist;

        expect(_file('tests/unit/controllers/foo-test.js'))
          .to.not.exist;
      }));
  });

  it('dummy controller foo/bar', function() {
    var args = ['controller', 'foo/bar', '--dummy'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/dummy/app/controllers/foo/bar.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain("export default Ember.Controller.extend({\n});");

        expect(_file('app/controllers/foo/bar.js'))
          .to.not.exist;

        expect(_file('tests/unit/controllers/foo/bar-test.js'))
          .to.not.exist;
      }));
  });

  it('in-repo-addon controller foo', function() {
    var args = ['controller', 'foo', '--in-repo-addon=my-addon'];

    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('lib/my-addon/addon/controllers/foo.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain("export default Ember.Controller.extend({\n});");

        expect(_file('lib/my-addon/app/controllers/foo.js'))
          .to.contain("export { default } from 'my-addon/controllers/foo';");

        expect(_file('tests/unit/controllers/foo-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo'");
      }));
  });

  it('in-repo-addon controller foo/bar', function() {
    var args = ['controller', 'foo/bar', '--in-repo-addon=my-addon'];

    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('lib/my-addon/addon/controllers/foo/bar.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain("export default Ember.Controller.extend({\n});");

        expect(_file('lib/my-addon/app/controllers/foo/bar.js'))
          .to.contain("export { default } from 'my-addon/controllers/foo/bar';");

        expect(_file('tests/unit/controllers/foo/bar-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo/bar'");
      }));
  });

  it('controller foo --pod', function() {
    var args = ['controller', 'foo', '--pod'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/foo/controller.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain("export default Ember.Controller.extend({\n});");

        expect(_file('tests/unit/foo/controller-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo'");
      }));
  });

  it('controller foo --pod podModulePrefix', function() {
    var args = ['controller', 'foo', '--pod'];

    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/pods/foo/controller.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain("export default Ember.Controller.extend({\n});");

        expect(_file('tests/unit/pods/foo/controller-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo'");
      }));
  });

  it('controller foo/bar --pod', function() {
    var args = ['controller', 'foo/bar', '--pod'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/foo/bar/controller.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain("export default Ember.Controller.extend({\n});");

        expect(_file('tests/unit/foo/bar/controller-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo/bar'");
      }));
  });

  it('controller foo/bar --pod podModulePrefix', function() {
    var args = ['controller', 'foo/bar', '--pod'];

    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/pods/foo/bar/controller.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain("export default Ember.Controller.extend({\n});");

        expect(_file('tests/unit/pods/foo/bar/controller-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo/bar'");
      }));
  });

  it('controller-test foo', function() {
    var args = ['controller-test', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/controllers/foo-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo'");
      }));
  });

  it('in-addon controller-test foo', function() {
    var args = ['controller-test', 'foo'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/controllers/foo-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('controller:foo'");
      }));
  });

  it('controller-test foo for mocha', function() {
    var args = ['controller-test', 'foo'];

    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/controllers/foo-test.js'))
          .to.contain("import { describeModule, it } from 'ember-mocha';")
          .to.contain("describeModule('controller:foo', 'Unit | Controller | foo'");
      }));
  });
});
