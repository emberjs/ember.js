'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const modifyPackages = blueprintHelpers.modifyPackages;
const setupPodConfig = blueprintHelpers.setupPodConfig;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

describe('Acceptance: ember generate and destroy initializer', function() {
  setupTestHooks(this);

  it('initializer foo', function() {
    let args = ['initializer', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/initializers/foo.js'))
          .to.contain("export function initialize(/* application */) {\n" +
                      "  // application.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('tests/unit/initializers/foo-test.js'))
          .to.contain("import { initialize } from 'my-app/initializers/foo';");
      }));
  });

  it('initializer foo/bar', function() {
    let args = ['initializer', 'foo/bar'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/initializers/foo/bar.js'))
          .to.contain("export function initialize(/* application */) {\n" +
                      "  // application.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('tests/unit/initializers/foo/bar-test.js'))
          .to.contain("import { initialize } from 'my-app/initializers/foo/bar';");
      }));
  });

  it('in-addon initializer foo', function() {
    let args = ['initializer', 'foo'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('addon/initializers/foo.js'))
          .to.contain("export function initialize(/* application */) {\n" +
                      "  // application.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('app/initializers/foo.js'))
          .to.contain("export { default, initialize } from 'my-addon/initializers/foo';");

        expect(_file('tests/unit/initializers/foo-test.js'))
          .to.exist;
      }));
  });

  it('in-addon initializer foo/bar', function() {
    let args = ['initializer', 'foo/bar'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('addon/initializers/foo/bar.js'))
          .to.contain("export function initialize(/* application */) {\n" +
                      "  // application.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('app/initializers/foo/bar.js'))
          .to.contain("export { default, initialize } from 'my-addon/initializers/foo/bar';");

        expect(_file('tests/unit/initializers/foo/bar-test.js'))
          .to.exist;
      }));
  });

  it('dummy initializer foo', function() {
    let args = ['initializer', 'foo', '--dummy'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/dummy/app/initializers/foo.js'))
          .to.contain("export function initialize(/* application */) {\n" +
                      "  // application.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('app/initializers/foo.js'))
          .to.not.exist;

        expect(_file('tests/unit/initializers/foo-test.js'))
          .to.not.exist;
      }));
  });

  it('dummy initializer foo/bar', function() {
    let args = ['initializer', 'foo/bar', '--dummy'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/dummy/app/initializers/foo/bar.js'))
          .to.contain("export function initialize(/* application */) {\n" +
                      "  // application.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('app/initializers/foo/bar.js'))
          .to.not.exist;

        expect(_file('tests/unit/initializers/foo/bar-test.js'))
          .to.not.exist;
      }));
  });

  it('in-repo-addon initializer foo', function() {
    let args = ['initializer', 'foo', '--in-repo-addon=my-addon'];

    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('lib/my-addon/addon/initializers/foo.js'))
          .to.contain("export function initialize(/* application */) {\n" +
                      "  // application.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('lib/my-addon/app/initializers/foo.js'))
          .to.contain("export { default, initialize } from 'my-addon/initializers/foo';");

        expect(_file('tests/unit/initializers/foo-test.js'))
          .to.exist;
      }));
  });

  it('in-repo-addon initializer foo/bar', function() {
    let args = ['initializer', 'foo/bar', '--in-repo-addon=my-addon'];

    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('lib/my-addon/addon/initializers/foo/bar.js'))
          .to.contain("export function initialize(/* application */) {\n" +
                      "  // application.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('lib/my-addon/app/initializers/foo/bar.js'))
          .to.contain("export { default, initialize } from 'my-addon/initializers/foo/bar';");

        expect(_file('tests/unit/initializers/foo/bar-test.js'))
          .to.exist;
      }));
  });

  /* Pod tests */

  it('initializer foo --pod', function() {
    let args = ['initializer', 'foo', '--pod'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/initializers/foo.js'))
          .to.contain("export function initialize(/* application */) {\n" +
                      "  // application.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  initialize\n" +
                      "};");
      }));
  });

  it('initializer foo --pod podModulePrefix', function() {
    let args = ['initializer', 'foo', '--pod'];

    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/initializers/foo.js'))
          .to.contain("export function initialize(/* application */) {\n" +
                      "  // application.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  initialize\n" +
                      "};");
      }));
  });

  it('initializer foo/bar --pod', function() {
    let args = ['initializer', 'foo/bar', '--pod'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/initializers/foo/bar.js'))
          .to.contain("export function initialize(/* application */) {\n" +
                      "  // application.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  initialize\n" +
                      "};");
      }));
  });


  it('initializer foo/bar --pod podModulePrefix', function() {
    let args = ['initializer', 'foo/bar', '--pod'];

    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/initializers/foo/bar.js'))
          .to.contain("export function initialize(/* application */) {\n" +
                      "  // application.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  initialize\n" +
                      "};");
      }));
  });


  it('initializer-test foo', function() {
    let args = ['initializer-test', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/initializers/foo-test.js'))
          .to.contain("import { initialize } from 'my-app/initializers/foo';")
          .to.contain("module('Unit | Initializer | foo'")
          .to.contain("application = Application.create();")
          .to.contain("initialize(this.application);");
      }));
  });

  it('in-addon initializer-test foo', function() {
    let args = ['initializer-test', 'foo'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/initializers/foo-test.js'))
          .to.contain("import { initialize } from 'dummy/initializers/foo';")
          .to.contain("module('Unit | Initializer | foo'")
          .to.contain("application = Application.create();")
          .to.contain("initialize(this.application);");
      }));
  });

  it('initializer-test foo for mocha', function() {
    let args = ['initializer-test', 'foo'];

    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/initializers/foo-test.js'))
          .to.contain("import { initialize } from 'my-app/initializers/foo';")
          .to.contain("describe('Unit | Initializer | foo', function() {")
          .to.contain("application = Application.create();")
          .to.contain("initialize(application);");
      }));
  });
});
