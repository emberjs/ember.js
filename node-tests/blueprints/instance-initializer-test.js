'use strict';

var blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
var setupTestHooks = blueprintHelpers.setupTestHooks;
var emberNew = blueprintHelpers.emberNew;
var emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
var modifyPackages = blueprintHelpers.modifyPackages;
var setupPodConfig = blueprintHelpers.setupPodConfig;

var chai = require('ember-cli-blueprint-test-helpers/chai');
var expect = chai.expect;

describe('Acceptance: ember generate and destroy instance-initializer', function() {
  setupTestHooks(this);

  it('instance-initializer foo', function() {
    var args = ['instance-initializer', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/instance-initializers/foo.js'))
          .to.contain("export function initialize(/* appInstance */) {\n" +
                      "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  name: 'foo',\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('tests/unit/instance-initializers/foo-test.js'))
          .to.contain("import { initialize } from 'my-app/instance-initializers/foo';");
      }));
  });

  it('instance-initializer foo/bar', function() {
    var args = ['instance-initializer', 'foo/bar'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/instance-initializers/foo/bar.js'))
          .to.contain("export function initialize(/* appInstance */) {\n" +
                      "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  name: 'foo/bar',\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('tests/unit/instance-initializers/foo/bar-test.js'))
          .to.contain("import { initialize } from 'my-app/instance-initializers/foo/bar';");
      }));
  });

  it('in-addon instance-initializer foo', function() {
    var args = ['instance-initializer', 'foo'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('addon/instance-initializers/foo.js'))
          .to.contain("export function initialize(/* appInstance */) {\n" +
                      "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  name: 'foo',\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('app/instance-initializers/foo.js'))
          .to.contain("export { default, initialize } from 'my-addon/instance-initializers/foo';");

        expect(_file('tests/unit/instance-initializers/foo-test.js'));
      }));
  });

  it('in-addon instance-initializer foo/bar', function() {
    var args = ['instance-initializer', 'foo/bar'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('addon/instance-initializers/foo/bar.js'))
          .to.contain("export function initialize(/* appInstance */) {\n" +
                      "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  name: 'foo/bar',\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('app/instance-initializers/foo/bar.js'))
          .to.contain("export { default, initialize } from 'my-addon/instance-initializers/foo/bar';");

        expect(_file('tests/unit/instance-initializers/foo/bar-test.js'));
      }));
  });

  it('dummy instance-initializer foo', function() {
    var args = ['instance-initializer', 'foo', '--dummy'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/dummy/app/instance-initializers/foo.js'))
          .to.contain("export function initialize(/* appInstance */) {\n" +
                      "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  name: 'foo',\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('app/instance-initializers/foo.js'))
          .to.not.exist;

        expect(_file('tests/unit/instance-initializers/foo-test.js'))
          .to.not.exist;
      }));
  });

  it('dummy instance-initializer foo/bar', function() {
    var args = ['instance-initializer', 'foo/bar', '--dummy'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/dummy/app/instance-initializers/foo/bar.js'))
          .to.contain("export function initialize(/* appInstance */) {\n" +
                      "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  name: 'foo/bar',\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('app/instance-initializers/foo/bar.js'))
          .to.not.exist;

        expect(_file('tests/unit/instance-initializers/foo/bar-test.js'))
          .to.not.exist;
      }));
  });

  it('in-repo-addon instance-initializer foo', function() {
    var args = ['instance-initializer', 'foo', '--in-repo-addon=my-addon'];

    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('lib/my-addon/addon/instance-initializers/foo.js'))
          .to.contain("export function initialize(/* appInstance */) {\n" +
                      "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  name: 'foo',\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('lib/my-addon/app/instance-initializers/foo.js'))
          .to.contain("export { default, initialize } from 'my-addon/instance-initializers/foo';");

        expect(_file('tests/unit/instance-initializers/foo-test.js'))
          .to.exist;
      }));
  });

  it('in-repo-addon instance-initializer foo/bar', function() {
    var args = ['instance-initializer', 'foo/bar', '--in-repo-addon=my-addon'];

    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('lib/my-addon/addon/instance-initializers/foo/bar.js'))
          .to.contain("export function initialize(/* appInstance */) {\n" +
                      "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  name: 'foo/bar',\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('lib/my-addon/app/instance-initializers/foo/bar.js'))
          .to.contain("export { default, initialize } from 'my-addon/instance-initializers/foo/bar';");

        expect(_file('tests/unit/instance-initializers/foo/bar-test.js'))
          .to.exist;
      }));
  });

  /* Pod tests */

  it('instance-initializer foo --pod', function() {
    var args = ['instance-initializer', 'foo', '--pod'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/instance-initializers/foo.js'))
          .to.contain("export function initialize(/* appInstance */) {\n" +
                      "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  name: 'foo',\n" +
                      "  initialize\n" +
                      "};");
      }));
  });

  it('instance-initializer foo --pod podModulePrefix', function() {
    var args = ['instance-initializer', 'foo', '--pod'];

    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/instance-initializers/foo.js'))
          .to.contain("export function initialize(/* appInstance */) {\n" +
                      "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  name: 'foo',\n" +
                      "  initialize\n" +
                      "};");
      }));
  });

  it('instance-initializer foo/bar --pod', function() {
    var args = ['instance-initializer', 'foo/bar', '--pod'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/instance-initializers/foo/bar.js'))
          .to.contain("export function initialize(/* appInstance */) {\n" +
                      "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  name: 'foo/bar',\n" +
                      "  initialize\n" +
                      "};");
      }));
  });


  it('instance-initializer foo/bar --pod podModulePrefix', function() {
    var args = ['instance-initializer', 'foo/bar', '--pod'];

    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/instance-initializers/foo/bar.js'))
          .to.contain("export function initialize(/* appInstance */) {\n" +
                      "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  name: 'foo/bar',\n" +
                      "  initialize\n" +
                      "};");
      }));
  });


  it('instance-initializer-test foo', function() {
    var args = ['instance-initializer-test', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/instance-initializers/foo-test.js'))
          .to.contain("import { initialize } from 'my-app/instance-initializers/foo';")
          .to.contain("module('Unit | Instance Initializer | foo'")
          .to.contain("application = Ember.Application.create();")
          .to.contain("this.appInstance = this.application.buildInstance();")
          .to.contain("initialize(this.appInstance);");
      }));
  });

  it('in-addon instance-initializer-test foo', function() {
    var args = ['instance-initializer-test', 'foo'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/instance-initializers/foo-test.js'))
          .to.contain("import { initialize } from 'dummy/instance-initializers/foo';")
          .to.contain("module('Unit | Instance Initializer | foo'")
          .to.contain("application = Ember.Application.create();")
          .to.contain("this.appInstance = this.application.buildInstance();")
          .to.contain("initialize(this.appInstance);");
      }));
  });

  it('instance-initializer-test foo for mocha', function() {
    var args = ['instance-initializer-test', 'foo'];

    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/instance-initializers/foo-test.js'))
          .to.contain("import { initialize } from 'my-app/instance-initializers/foo';")
          .to.contain("describe('Unit | Instance Initializer | foo', function() {")
          .to.contain("application = Ember.Application.create();")
          .to.contain("appInstance = application.buildInstance();")
          .to.contain("initialize(appInstance);");
      }));
  });
});
