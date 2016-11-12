'use strict';

var blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
var setupTestHooks = blueprintHelpers.setupTestHooks;
var emberNew = blueprintHelpers.emberNew;
var emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
var modifyPackages = blueprintHelpers.modifyPackages;
var setupPodConfig = blueprintHelpers.setupPodConfig;

var chai = require('ember-cli-blueprint-test-helpers/chai');
var expect = chai.expect;

describe('Acceptance: ember generate and destroy initializer', function() {
  setupTestHooks(this);

  it('initializer foo', function() {
    var args = ['initializer', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/initializers/foo.js'))
          .to.contain("export function initialize(/* application */) {\n" +
                      "  // application.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  name: 'foo',\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('tests/unit/initializers/foo-test.js'))
          .to.contain("import FooInitializer from 'my-app/initializers/foo';");
      }));
  });

  it('initializer foo/bar', function() {
    var args = ['initializer', 'foo/bar'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/initializers/foo/bar.js'))
          .to.contain("export function initialize(/* application */) {\n" +
                      "  // application.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  name: 'foo/bar',\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('tests/unit/initializers/foo/bar-test.js'))
          .to.contain("import FooBarInitializer from 'my-app/initializers/foo/bar';");
      }));
  });

  it('in-addon initializer foo', function() {
    var args = ['initializer', 'foo'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('addon/initializers/foo.js'))
          .to.contain("export function initialize(/* application */) {\n" +
                      "  // application.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  name: 'foo',\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('app/initializers/foo.js'))
          .to.contain("export { default, initialize } from 'my-addon/initializers/foo';");

        expect(_file('tests/unit/initializers/foo-test.js'))
          .to.exist;
      }));
  });

  it('in-addon initializer foo/bar', function() {
    var args = ['initializer', 'foo/bar'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('addon/initializers/foo/bar.js'))
          .to.contain("export function initialize(/* application */) {\n" +
                      "  // application.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  name: 'foo/bar',\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('app/initializers/foo/bar.js'))
          .to.contain("export { default, initialize } from 'my-addon/initializers/foo/bar';");

        expect(_file('tests/unit/initializers/foo/bar-test.js'))
          .to.exist;
      }));
  });

  it('dummy initializer foo', function() {
    var args = ['initializer', 'foo', '--dummy'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/dummy/app/initializers/foo.js'))
          .to.contain("export function initialize(/* application */) {\n" +
                      "  // application.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  name: 'foo',\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('app/initializers/foo.js'))
          .to.not.exist;

        expect(_file('tests/unit/initializers/foo-test.js'))
          .to.not.exist;
      }));
  });

  it('dummy initializer foo/bar', function() {
    var args = ['initializer', 'foo/bar', '--dummy'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/dummy/app/initializers/foo/bar.js'))
          .to.contain("export function initialize(/* application */) {\n" +
                      "  // application.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  name: 'foo/bar',\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('app/initializers/foo/bar.js'))
          .to.not.exist;

        expect(_file('tests/unit/initializers/foo/bar-test.js'))
          .to.not.exist;
      }));
  });

  it('in-repo-addon initializer foo', function() {
    var args = ['initializer', 'foo', '--in-repo-addon=my-addon'];

    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('lib/my-addon/addon/initializers/foo.js'))
          .to.contain("export function initialize(/* application */) {\n" +
                      "  // application.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  name: 'foo',\n" +
                      "  initialize\n" +
                      "};");

        expect(_file('lib/my-addon/app/initializers/foo.js'))
          .to.contain("export { default, initialize } from 'my-addon/initializers/foo';");

        expect(_file('tests/unit/initializers/foo-test.js'))
          .to.exist;
      }));
  });

  it('in-repo-addon initializer foo/bar', function() {
    var args = ['initializer', 'foo/bar', '--in-repo-addon=my-addon'];

    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('lib/my-addon/addon/initializers/foo/bar.js'))
          .to.contain("export function initialize(/* application */) {\n" +
                      "  // application.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  name: 'foo/bar',\n" +
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
    var args = ['initializer', 'foo', '--pod'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/initializers/foo.js'))
          .to.contain("export function initialize(/* application */) {\n" +
                      "  // application.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  name: 'foo',\n" +
                      "  initialize\n" +
                      "};");
      }));
  });

  it('initializer foo --pod podModulePrefix', function() {
    var args = ['initializer', 'foo', '--pod'];

    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/initializers/foo.js'))
          .to.contain("export function initialize(/* application */) {\n" +
                      "  // application.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  name: 'foo',\n" +
                      "  initialize\n" +
                      "};");
      }));
  });

  it('initializer foo/bar --pod', function() {
    var args = ['initializer', 'foo/bar', '--pod'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/initializers/foo/bar.js'))
          .to.contain("export function initialize(/* application */) {\n" +
                      "  // application.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  name: 'foo/bar',\n" +
                      "  initialize\n" +
                      "};");
      }));
  });


  it('initializer foo/bar --pod podModulePrefix', function() {
    var args = ['initializer', 'foo/bar', '--pod'];

    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/initializers/foo/bar.js'))
          .to.contain("export function initialize(/* application */) {\n" +
                      "  // application.inject('route', 'foo', 'service:foo');\n" +
                      "}\n" +
                      "\n" +
                      "export default {\n" +
                      "  name: 'foo/bar',\n" +
                      "  initialize\n" +
                      "};");
      }));
  });


  it('initializer-test foo', function() {
    var args = ['initializer-test', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/initializers/foo-test.js'))
          .to.contain("import FooInitializer from 'my-app/initializers/foo';")
          .to.contain("module('Unit | Initializer | foo'")
          .to.contain("application = Ember.Application.create();")
          .to.contain("FooInitializer.initialize(application);");
      }));
  });

  it('in-addon initializer-test foo', function() {
    var args = ['initializer-test', 'foo'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/initializers/foo-test.js'))
          .to.contain("import FooInitializer from 'dummy/initializers/foo';")
          .to.contain("module('Unit | Initializer | foo'")
          .to.contain("application = Ember.Application.create();")
          .to.contain("FooInitializer.initialize(application);");
      }));
  });

  it('initializer-test foo for mocha', function() {
    var args = ['initializer-test', 'foo'];

    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/initializers/foo-test.js'))
          .to.contain("import FooInitializer from 'my-app/initializers/foo';")
          .to.contain("describe('Unit | Initializer | foo', function() {")
          .to.contain("application = Ember.Application.create();")
          .to.contain("FooInitializer.initialize(application);");
      }));
  });
});
