'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const modifyPackages = blueprintHelpers.modifyPackages;
const setupPodConfig = blueprintHelpers.setupPodConfig;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

describe('Acceptance: ember generate and destroy instance-initializer', function() {
  setupTestHooks(this);

  it('instance-initializer foo', function() {
    let args = ['instance-initializer', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/instance-initializers/foo.js'))
          .to.contain("export function initialize(/* appInstance */) {\n" +
                      "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('tests/unit/instance-initializers/foo-test.js'))
          .to.contain("import { initialize } from 'my-app/instance-initializers/foo';");
      }));
  });

  it('instance-initializer foo/bar', function() {
    let args = ['instance-initializer', 'foo/bar'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/instance-initializers/foo/bar.js'))
          .to.contain("export function initialize(/* appInstance */) {\n" +
                      "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('tests/unit/instance-initializers/foo/bar-test.js'))
          .to.contain("import { initialize } from 'my-app/instance-initializers/foo/bar';");
      }));
  });

  it('in-addon instance-initializer foo', function() {
    let args = ['instance-initializer', 'foo'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('addon/instance-initializers/foo.js'))
          .to.contain("export function initialize(/* appInstance */) {\n" +
                      "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('app/instance-initializers/foo.js'))
          .to.contain("export { default, initialize } from 'my-addon/instance-initializers/foo';");

        expect(_file('tests/unit/instance-initializers/foo-test.js'));
      }));
  });

  it('in-addon instance-initializer foo/bar', function() {
    let args = ['instance-initializer', 'foo/bar'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('addon/instance-initializers/foo/bar.js'))
          .to.contain("export function initialize(/* appInstance */) {\n" +
                      "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('app/instance-initializers/foo/bar.js'))
          .to.contain("export { default, initialize } from 'my-addon/instance-initializers/foo/bar';");

        expect(_file('tests/unit/instance-initializers/foo/bar-test.js'));
      }));
  });

  it('dummy instance-initializer foo', function() {
    let args = ['instance-initializer', 'foo', '--dummy'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/dummy/app/instance-initializers/foo.js'))
          .to.contain("export function initialize(/* appInstance */) {\n" +
                      "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('app/instance-initializers/foo.js'))
          .to.not.exist;

        expect(_file('tests/unit/instance-initializers/foo-test.js'))
          .to.not.exist;
      }));
  });

  it('dummy instance-initializer foo/bar', function() {
    let args = ['instance-initializer', 'foo/bar', '--dummy'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/dummy/app/instance-initializers/foo/bar.js'))
          .to.contain("export function initialize(/* appInstance */) {\n" +
                      "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('app/instance-initializers/foo/bar.js'))
          .to.not.exist;

        expect(_file('tests/unit/instance-initializers/foo/bar-test.js'))
          .to.not.exist;
      }));
  });

  it('in-repo-addon instance-initializer foo', function() {
    let args = ['instance-initializer', 'foo', '--in-repo-addon=my-addon'];

    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('lib/my-addon/addon/instance-initializers/foo.js'))
          .to.contain("export function initialize(/* appInstance */) {\n" +
                      "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('lib/my-addon/app/instance-initializers/foo.js'))
          .to.contain("export { default, initialize } from 'my-addon/instance-initializers/foo';");

        expect(_file('tests/unit/instance-initializers/foo-test.js'))
          .to.exist;
      }));
  });

  it('in-repo-addon instance-initializer foo/bar', function() {
    let args = ['instance-initializer', 'foo/bar', '--in-repo-addon=my-addon'];

    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('lib/my-addon/addon/instance-initializers/foo/bar.js'))
          .to.contain("export function initialize(/* appInstance */) {\n" +
                      "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
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
    let args = ['instance-initializer', 'foo', '--pod'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/instance-initializers/foo.js'))
          .to.contain("export function initialize(/* appInstance */) {\n" +
                      "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  initialize\n" +
                      "};");
      }));
  });

  it('instance-initializer foo --pod podModulePrefix', function() {
    let args = ['instance-initializer', 'foo', '--pod'];

    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/instance-initializers/foo.js'))
          .to.contain("export function initialize(/* appInstance */) {\n" +
                      "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  initialize\n" +
                      "};");
      }));
  });

  it('instance-initializer foo/bar --pod', function() {
    let args = ['instance-initializer', 'foo/bar', '--pod'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/instance-initializers/foo/bar.js'))
          .to.contain("export function initialize(/* appInstance */) {\n" +
                      "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  initialize\n" +
                      "};");
      }));
  });


  it('instance-initializer foo/bar --pod podModulePrefix', function() {
    let args = ['instance-initializer', 'foo/bar', '--pod'];

    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/instance-initializers/foo/bar.js'))
          .to.contain("export function initialize(/* appInstance */) {\n" +
                      "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  initialize\n" +
                      "};");
      }));
  });


  it('instance-initializer-test foo', function() {
    let args = ['instance-initializer-test', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/instance-initializers/foo-test.js'))
          .to.contain("import { initialize } from 'my-app/instance-initializers/foo';")
          .to.contain("module('Unit | Instance Initializer | foo'")
          .to.contain("application = Application.create();")
          .to.contain("this.appInstance = this.application.buildInstance();")
          .to.contain("initialize(this.appInstance);");
      }));
  });

  it('in-addon instance-initializer-test foo', function() {
    let args = ['instance-initializer-test', 'foo'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/instance-initializers/foo-test.js'))
          .to.contain("import { initialize } from 'dummy/instance-initializers/foo';")
          .to.contain("module('Unit | Instance Initializer | foo'")
          .to.contain("application = Application.create();")
          .to.contain("this.appInstance = this.application.buildInstance();")
          .to.contain("initialize(this.appInstance);");
      }));
  });

  it('instance-initializer-test foo for mocha', function() {
    let args = ['instance-initializer-test', 'foo'];

    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/instance-initializers/foo-test.js'))
          .to.contain("import { initialize } from 'my-app/instance-initializers/foo';")
          .to.contain("describe('Unit | Instance Initializer | foo', function() {")
          .to.contain("application = Application.create();")
          .to.contain("appInstance = application.buildInstance();")
          .to.contain("initialize(appInstance);");
      }));
  });
});
