'use strict';

const fs = require('fs');

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const modifyPackages = blueprintHelpers.modifyPackages;
const setupPodConfig = blueprintHelpers.setupPodConfig;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

const generateFakePackageManifest = require('../helpers/generate-fake-package-manifest');
const fixture = require('../helpers/file');

describe('Acceptance: ember generate component', function() {
  setupTestHooks(this);

  it('component x-foo', function() {
    let args = ['component', 'x-foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/components/x-foo.js')).to.contain("import Component from '@ember/component';")
          .to.contain("export default Component.extend({")
          .to.contain("});");

        expect(_file('app/templates/components/x-foo.hbs'))
          .to.equal("{{yield}}");

        expect(_file('tests/integration/components/x-foo-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';")
          .to.contain("moduleForComponent('x-foo'")
          .to.contain("integration: true")
          .to.contain("{{x-foo}}")
          .to.contain("{{#x-foo}}");
      }));
  });

  it('component foo/x-foo', function() {
    let args = ['component', 'foo/x-foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/components/foo/x-foo.js'))
          .to.contain("import Component from '@ember/component';")
          .to.contain("export default Component.extend({")
          .to.contain("});");

        expect(_file('app/templates/components/foo/x-foo.hbs'))
          .to.equal("{{yield}}");

        expect(_file('tests/integration/components/foo/x-foo-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';")
          .to.contain("moduleForComponent('foo/x-foo'")
          .to.contain("integration: true")
          .to.contain("{{foo/x-foo}}")
          .to.contain("{{#foo/x-foo}}");
      }));
  });

  it('component x-foo ignores --path option', function() {
    let args = ['component', 'x-foo', '--path', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/components/x-foo.js'))
          .to.contain("import Component from '@ember/component';")
          .to.contain("export default Component.extend({")
          .to.contain("});");

        expect(_file('app/templates/components/x-foo.hbs'))
          .to.equal("{{yield}}");

        expect(_file('tests/integration/components/x-foo-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';")
          .to.contain("moduleForComponent('x-foo'")
          .to.contain("integration: true")
          .to.contain("{{x-foo}}")
          .to.contain("{{#x-foo}}");
      }));
  });

  it('in-addon component x-foo', function() {
    let args = ['component', 'x-foo'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('addon/components/x-foo.js'))
          .to.contain("import Component from '@ember/component';")
          .to.contain("import layout from '../templates/components/x-foo';")
          .to.contain("export default Component.extend({")
          .to.contain("layout")
          .to.contain("});");

        expect(_file('addon/templates/components/x-foo.hbs'))
          .to.equal("{{yield}}");

        expect(_file('app/components/x-foo.js'))
          .to.contain("export { default } from 'my-addon/components/x-foo';");

        expect(_file('tests/integration/components/x-foo-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';")
          .to.contain("moduleForComponent('x-foo'")
          .to.contain("integration: true")
          .to.contain("{{x-foo}}")
          .to.contain("{{#x-foo}}");
      }));
  });

  it('in-addon component nested/x-foo', function() {
    let args = ['component', 'nested/x-foo'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('addon/components/nested/x-foo.js'))
          .to.contain("import Component from '@ember/component';")
          .to.contain("import layout from '../../templates/components/nested/x-foo';")
          .to.contain("export default Component.extend({")
          .to.contain("layout")
          .to.contain("});");

        expect(_file('addon/templates/components/nested/x-foo.hbs'))
          .to.equal("{{yield}}");

        expect(_file('app/components/nested/x-foo.js'))
          .to.contain("export { default } from 'my-addon/components/nested/x-foo';");

        expect(_file('tests/integration/components/nested/x-foo-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';")
          .to.contain("moduleForComponent('nested/x-foo'")
          .to.contain("integration: true")
          .to.contain("{{nested/x-foo}}")
          .to.contain("{{#nested/x-foo}}");
      }));
  });

  it('dummy component x-foo', function() {
    let args = ['component', 'x-foo', '--dummy'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/dummy/app/components/x-foo.js'))
          .to.contain("import Component from '@ember/component';")
          .to.contain("export default Component.extend({")
          .to.contain("});");

        expect(_file('tests/dummy/app/templates/components/x-foo.hbs'))
          .to.equal("{{yield}}");

        expect(_file('app/components/x-foo.js'))
          .to.not.exist;

        expect(_file('tests/unit/components/x-foo-test.js'))
          .to.not.exist;
      }));
  });

  it('dummy component nested/x-foo', function() {
    let args = ['component', 'nested/x-foo', '--dummy'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/dummy/app/components/nested/x-foo.js'))
          .to.contain("import Component from '@ember/component';")
          .to.contain("export default Component.extend({")
          .to.contain("});");

        expect(_file('tests/dummy/app/templates/components/nested/x-foo.hbs'))
          .to.equal("{{yield}}");

        expect(_file('app/components/nested/x-foo.js'))
          .to.not.exist;

        expect(_file('tests/unit/components/nested/x-foo-test.js'))
          .to.not.exist;
      }));
  });

  it('in-repo-addon component x-foo', function() {
    let args = ['component', 'x-foo', '--in-repo-addon=my-addon'];

    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('lib/my-addon/addon/components/x-foo.js'))
          .to.contain("import Component from '@ember/component';")
          .to.contain("import layout from '../templates/components/x-foo';")
          .to.contain("export default Component.extend({")
          .to.contain("layout")
          .to.contain("});");

        expect(_file('lib/my-addon/addon/templates/components/x-foo.hbs'))
          .to.equal("{{yield}}");

        expect(_file('lib/my-addon/app/components/x-foo.js'))
          .to.contain("export { default } from 'my-addon/components/x-foo';");

        expect(_file('tests/integration/components/x-foo-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';")
          .to.contain("moduleForComponent('x-foo'")
          .to.contain("integration: true")
          .to.contain("{{x-foo}}")
          .to.contain("{{#x-foo}}");
      }));
  });

  it('in-repo-addon component-test x-foo', function() {
    let args = ['component-test', 'x-foo', '--in-repo-addon=my-addon'];

    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/integration/components/x-foo-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';")
          .to.contain("moduleForComponent('x-foo'")
          .to.contain("integration: true")
          .to.contain("{{x-foo}}")
          .to.contain("{{#x-foo}}");
      }));
  });

  it('in-repo-addon component-test x-foo --unit', function() {
    let args = ['component-test', 'x-foo', '--in-repo-addon=my-addon', '--unit'];

    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/components/x-foo-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("moduleForComponent('x-foo'")
          .to.contain("unit: true");
      }));
  });

  it('in-repo-addon component nested/x-foo', function() {
    let args = ['component', 'nested/x-foo', '--in-repo-addon=my-addon'];

    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('lib/my-addon/addon/components/nested/x-foo.js'))
          .to.contain("import Component from '@ember/component';")
          .to.contain("import layout from '../../templates/components/nested/x-foo';")
          .to.contain("export default Component.extend({")
          .to.contain("layout")
          .to.contain("});");

        expect(_file('lib/my-addon/addon/templates/components/nested/x-foo.hbs'))
          .to.equal("{{yield}}");

        expect(_file('lib/my-addon/app/components/nested/x-foo.js'))
          .to.contain("export { default } from 'my-addon/components/nested/x-foo';");

        expect(_file('tests/integration/components/nested/x-foo-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';")
          .to.contain("moduleForComponent('nested/x-foo'")
          .to.contain("integration: true");
      }));
  });

  // Pod tests
  it('component x-foo --pod', function() {
    let args = ['component', 'x-foo', '--pod'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/components/x-foo/component.js'))
          .to.contain("import Component from '@ember/component';")
          .to.contain("export default Component.extend({")
          .to.contain("});");

        expect(_file('app/components/x-foo/template.hbs'))
          .to.equal("{{yield}}");

        expect(_file('tests/integration/components/x-foo/component-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';")
          .to.contain("moduleForComponent('x-foo'")
          .to.contain("integration: true");
      }));
  });

  it('component x-foo --pod podModulePrefix', function() {
    let args = ['component', 'x-foo', '--pod'];

    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/pods/components/x-foo/component.js'))
          .to.contain("import Component from '@ember/component';")
          .to.contain("export default Component.extend({")
          .to.contain("});");

        expect(_file('app/pods/components/x-foo/template.hbs'))
          .to.equal("{{yield}}");

        expect(_file('tests/integration/pods/components/x-foo/component-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';")
          .to.contain("moduleForComponent('x-foo'")
          .to.contain("integration: true")
          .to.contain("{{x-foo}}")
          .to.contain("{{#x-foo}}");
      }));
  });

  it('component foo/x-foo --pod', function() {
    let args = ['component', 'foo/x-foo', '--pod'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/components/foo/x-foo/component.js'))
          .to.contain("import Component from '@ember/component';")
          .to.contain("export default Component.extend({")
          .to.contain("});");

        expect(_file('app/components/foo/x-foo/template.hbs'))
          .to.equal("{{yield}}");

        expect(_file('tests/integration/components/foo/x-foo/component-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';")
          .to.contain("moduleForComponent('foo/x-foo'")
          .to.contain("integration: true")
          .to.contain("{{foo/x-foo}}")
          .to.contain("{{#foo/x-foo}}");
      }));
  });

  it('component foo/x-foo --pod podModulePrefix', function() {
    let args = ['component', 'foo/x-foo', '--pod'];

    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/pods/components/foo/x-foo/component.js'))
          .to.contain("import Component from '@ember/component';")
          .to.contain("export default Component.extend({")
          .to.contain("});");

        expect(_file('app/pods/components/foo/x-foo/template.hbs'))
          .to.equal("{{yield}}");

        expect(_file('tests/integration/pods/components/foo/x-foo/component-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';")
          .to.contain("moduleForComponent('foo/x-foo'")
          .to.contain("integration: true")
          .to.contain("{{foo/x-foo}}")
          .to.contain("{{#foo/x-foo}}");
      }));
  });

  it('component x-foo --pod --path', function() {
    let args = ['component', 'x-foo', '--pod', '--path', 'bar'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/bar/x-foo/component.js'))
          .to.contain("import Component from '@ember/component';")
          .to.contain("export default Component.extend({")
          .to.contain("});");

        expect(_file('app/bar/x-foo/template.hbs'))
          .to.equal("{{yield}}");

        expect(_file('tests/integration/bar/x-foo/component-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';")
          .to.contain("moduleForComponent('bar/x-foo'")
          .to.contain("integration: true")
          .to.contain("{{bar/x-foo}}")
          .to.contain("{{#bar/x-foo}}");
      }));
  });

  it('component x-foo --pod --path podModulePrefix', function() {
    let args = ['component', 'x-foo', '--pod', '--path', 'bar'];

    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/pods/bar/x-foo/component.js'))
          .to.contain("import Component from '@ember/component';")
          .to.contain("export default Component.extend({")
          .to.contain("});");

        expect(_file('app/pods/bar/x-foo/template.hbs'))
          .to.equal("{{yield}}");

        expect(_file('tests/integration/pods/bar/x-foo/component-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';")
          .to.contain("moduleForComponent('bar/x-foo'")
          .to.contain("integration: true")
          .to.contain("{{bar/x-foo}}")
          .to.contain("{{#bar/x-foo}}");
      }));
  });

  it('component foo/x-foo --pod --path', function() {
    let args = ['component', 'foo/x-foo', '--pod', '--path', 'bar'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/bar/foo/x-foo/component.js'))
          .to.contain("import Component from '@ember/component';")
          .to.contain("export default Component.extend({")
          .to.contain("});");

        expect(_file('app/bar/foo/x-foo/template.hbs'))
          .to.equal("{{yield}}");

        expect(_file('tests/integration/bar/foo/x-foo/component-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';")
          .to.contain("moduleForComponent('bar/foo/x-foo'")
          .to.contain("integration: true")
          .to.contain("{{bar/foo/x-foo}}")
          .to.contain("{{#bar/foo/x-foo}}");
      }));
  });

  it('component foo/x-foo --pod --path podModulePrefix', function() {
    let args = ['component', 'foo/x-foo', '--pod', '--path', 'bar'];

    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/pods/bar/foo/x-foo/component.js'))
          .to.contain("import Component from '@ember/component';")
          .to.contain("export default Component.extend({")
          .to.contain("});");

        expect(_file('app/pods/bar/foo/x-foo/template.hbs'))
          .to.equal("{{yield}}");

        expect(_file('tests/integration/pods/bar/foo/x-foo/component-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("moduleForComponent('bar/foo/x-foo'")
          .to.contain("integration: true")
          .to.contain("{{bar/foo/x-foo}}")
          .to.contain("{{#bar/foo/x-foo}}");
      }));
  });

  it('component x-foo --pod --path nested', function() {
    let args = ['component', 'x-foo', '--pod', '--path', 'bar/baz'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/bar/baz/x-foo/component.js'))
          .to.contain("import Component from '@ember/component';")
          .to.contain("export default Component.extend({")
          .to.contain("});");

        expect(_file('app/bar/baz/x-foo/template.hbs'))
          .to.equal("{{yield}}");

        expect(_file('tests/integration/bar/baz/x-foo/component-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';")
          .to.contain("moduleForComponent('bar/baz/x-foo'")
          .to.contain("integration: true")
          .to.contain("{{bar/baz/x-foo}}")
          .to.contain("{{#bar/baz/x-foo}}");
      }));
  });

  it('component x-foo --pod --path nested podModulePrefix', function() {
    let args = ['component', 'x-foo', '--pod', '--path', 'bar/baz'];

    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/pods/bar/baz/x-foo/component.js'))
          .to.contain("import Component from '@ember/component';")
          .to.contain("export default Component.extend({")
          .to.contain("});");

        expect(_file('app/pods/bar/baz/x-foo/template.hbs'))
          .to.equal("{{yield}}");

        expect(_file('tests/integration/pods/bar/baz/x-foo/component-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';")
          .to.contain("moduleForComponent('bar/baz/x-foo'")
          .to.contain("integration: true")
          .to.contain("{{bar/baz/x-foo}}")
          .to.contain("{{#bar/baz/x-foo}}");
      }));
  });

  it('component foo/x-foo --pod --path nested', function() {
    let args = ['component', 'foo/x-foo', '--pod', '--path', 'bar/baz'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/bar/baz/foo/x-foo/component.js'))
          .to.contain("import Component from '@ember/component';")
          .to.contain("export default Component.extend({")
          .to.contain("});");

        expect(_file('app/bar/baz/foo/x-foo/template.hbs'))
          .to.equal("{{yield}}");

        expect(_file('tests/integration/bar/baz/foo/x-foo/component-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';")
          .to.contain("moduleForComponent('bar/baz/foo/x-foo'")
          .to.contain("integration: true")
          .to.contain("{{bar/baz/foo/x-foo}}")
          .to.contain("{{#bar/baz/foo/x-foo}}");
      }));
  });

  it('component foo/x-foo --pod --path nested podModulePrefix', function() {
    let args = ['component', 'foo/x-foo', '--pod', '--path', 'bar/baz'];

    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/pods/bar/baz/foo/x-foo/component.js'))
          .to.contain("import Component from '@ember/component';")
          .to.contain("export default Component.extend({")
          .to.contain("});");

        expect(_file('app/pods/bar/baz/foo/x-foo/template.hbs'))
          .to.equal("{{yield}}");

        expect(_file('tests/integration/pods/bar/baz/foo/x-foo/component-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';")
          .to.contain("moduleForComponent('bar/baz/foo/x-foo'")
          .to.contain("integration: true")
          .to.contain("{{bar/baz/foo/x-foo}}")
          .to.contain("{{#bar/baz/foo/x-foo}}");
      }));
  });

  it('component x-foo --pod -no-path', function() {
    let args = ['component', 'x-foo', '--pod', '-no-path'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/x-foo/component.js'))
          .to.contain("import Component from '@ember/component';")
          .to.contain("export default Component.extend({")
          .to.contain("});");

        expect(_file('app/x-foo/template.hbs'))
          .to.equal("{{yield}}");

        expect(_file('tests/integration/x-foo/component-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';")
          .to.contain("moduleForComponent('x-foo'")
          .to.contain("integration: true")
          .to.contain("{{x-foo}}")
          .to.contain("{{#x-foo}}");
      }));
  });

  it('component x-foo --pod -no-path podModulePrefix', function() {
    let args = ['component', 'x-foo', '--pod', '-no-path'];

    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/pods/x-foo/component.js'))
          .to.contain("import Component from '@ember/component';")
          .to.contain("export default Component.extend({")
          .to.contain("});");

        expect(_file('app/pods/x-foo/template.hbs'))
          .to.equal("{{yield}}");

        expect(_file('tests/integration/pods/x-foo/component-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';")
          .to.contain("moduleForComponent('x-foo'")
          .to.contain("integration: true")
          .to.contain("{{x-foo}}")
          .to.contain("{{#x-foo}}");
      }));
  });

  it('component foo/x-foo --pod -no-path', function() {
    let args = ['component', 'foo/x-foo', '--pod', '-no-path'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/foo/x-foo/component.js'))
          .to.contain("import Component from '@ember/component';")
          .to.contain("export default Component.extend({")
          .to.contain("});");

        expect(_file('app/foo/x-foo/template.hbs'))
          .to.equal("{{yield}}");

        expect(_file('tests/integration/foo/x-foo/component-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';")
          .to.contain("moduleForComponent('foo/x-foo'")
          .to.contain("integration: true")
          .to.contain("{{foo/x-foo}}")
          .to.contain("{{#foo/x-foo}}");
      }));
  });

  it('component foo/x-foo --pod -no-path podModulePrefix', function() {
    let args = ['component', 'foo/x-foo', '--pod', '-no-path'];

    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/pods/foo/x-foo/component.js'))
          .to.contain("import Component from '@ember/component';")
          .to.contain("export default Component.extend({")
          .to.contain("});");

        expect(_file('app/pods/foo/x-foo/template.hbs'))
          .to.equal("{{yield}}");

        expect(_file('tests/integration/pods/foo/x-foo/component-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';")
          .to.contain("moduleForComponent('foo/x-foo'")
          .to.contain("integration: true")
          .to.contain("{{foo/x-foo}}")
          .to.contain("{{#foo/x-foo}}");
      }));
  });

  it('in-addon component x-foo --pod', function() {
    let args = ['component', 'x-foo', '--pod'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('addon/components/x-foo/component.js'))
          .to.contain("import Component from '@ember/component';")
          .to.contain("import layout from './template';")
          .to.contain("export default Component.extend({")
          .to.contain("layout")
          .to.contain("});");

        expect(_file('addon/components/x-foo/template.hbs'))
          .to.equal("{{yield}}");

        expect(_file('app/components/x-foo/component.js'))
          .to.contain("export { default } from 'my-addon/components/x-foo/component';");

        expect(_file('tests/integration/components/x-foo/component-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("moduleForComponent('x-foo'")
          .to.contain("integration: true");
      }));
  });

  it('in-repo-addon component x-foo --pod', function() {
    let args = ['component', 'x-foo', '--in-repo-addon=my-addon', '--pod'];

    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('lib/my-addon/addon/components/x-foo/component.js'))
          .to.contain("import Component from '@ember/component';")
          .to.contain("import layout from './template';")
          .to.contain("export default Component.extend({")
          .to.contain("layout")
          .to.contain("});");

        expect(_file('lib/my-addon/addon/components/x-foo/template.hbs'))
          .to.equal("{{yield}}");

        expect(_file('lib/my-addon/app/components/x-foo/component.js'))
          .to.contain("export { default } from 'my-addon/components/x-foo/component';");

        expect(_file('tests/integration/components/x-foo/component-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("moduleForComponent('x-foo'")
          .to.contain("integration: true");
      }));
  });

  it('in-repo-addon component nested/x-foo', function() {
    let args = ['component', 'nested/x-foo', '--in-repo-addon=my-addon', '--pod'];

    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('lib/my-addon/addon/components/nested/x-foo/component.js'))
          .to.contain("import Component from '@ember/component';")
          .to.contain("import layout from './template';")
          .to.contain("export default Component.extend({")
          .to.contain("layout")
          .to.contain("});");

        expect(_file('lib/my-addon/addon/components/nested/x-foo/template.hbs'))
          .to.equal("{{yield}}");

        expect(_file('lib/my-addon/app/components/nested/x-foo/component.js'))
          .to.contain("export { default } from 'my-addon/components/nested/x-foo/component';");

        expect(_file('tests/integration/components/nested/x-foo/component-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("moduleForComponent('nested/x-foo'")
          .to.contain("integration: true");
      }));
  });

  it('component-test x-foo', function() {
    let args = ['component-test', 'x-foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/integration/components/x-foo-test.js'))
          .to.equal(fixture('component-test/default.js'));
      }));
  });

  describe('usePods: true', function() {
    it('component-test x-foo', function() {
      let args = ['component-test', 'x-foo'];

      return emberNew()
        .then(() => {
          fs.writeFileSync('.ember-cli', `{
            "disableAnalytics": false,
            "usePods": true
          }`);
        })
        .then(() => emberGenerateDestroy(args, _file => {
          expect(_file('tests/integration/components/x-foo/component-test.js'))
            .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
            .to.contain("import hbs from 'htmlbars-inline-precompile';")
            .to.contain("moduleForComponent('x-foo'")
            .to.contain("integration: true")
            .to.contain("{{x-foo}}")
            .to.contain("{{#x-foo}}");
        }));
    });
  });

  it('component-test x-foo --unit', function() {
    let args = ['component-test', 'x-foo', '--unit'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/components/x-foo-test.js'))
          .to.equal(fixture('component-test/unit.js'));
      }));
  });

  it('in-addon component-test x-foo', function() {
    let args = ['component-test', 'x-foo'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/integration/components/x-foo-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';")
          .to.contain("moduleForComponent('x-foo'")
          .to.contain("integration: true")
          .to.contain("{{x-foo}}")
          .to.contain("{{#x-foo}}");

        expect(_file('app/component-test/x-foo.js'))
          .to.not.exist;
      }));
  });

  it('in-addon component-test x-foo --unit', function() {
    let args = ['component-test', 'x-foo', '--unit'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/components/x-foo-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("moduleForComponent('x-foo'")
          .to.contain("unit: true");

        expect(_file('app/component-test/x-foo.js'))
          .to.not.exist;
      }));
  });

  it('dummy component-test x-foo', function() {
    let args = ['component-test', 'x-foo', '--dummy'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/integration/components/x-foo-test.js'))
          .to.contain("import { moduleForComponent, test } from 'ember-qunit';")
          .to.contain("import hbs from 'htmlbars-inline-precompile';")
          .to.contain("moduleForComponent('x-foo'");

        expect(_file('app/component-test/x-foo.js'))
          .to.not.exist;
      }));
  });

  it('component-test x-foo for RFC232', function() {
    let args = ['component-test', 'x-foo'];

    return emberNew()
      .then(() => generateFakePackageManifest('ember-cli-qunit', '4.1.1'))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/integration/components/x-foo-test.js'))
          .to.equal(fixture('component-test/rfc232.js'));
      }));
  });

  it('component-test x-foo --unit for RFC232', function() {
    let args = ['component-test', 'x-foo', '--unit'];

    return emberNew()
      .then(() => generateFakePackageManifest('ember-cli-qunit', '4.1.1'))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/components/x-foo-test.js'))
          .to.equal(fixture('component-test/rfc232-unit.js'));
      }));
  });

  it('component-test x-foo for mocha', function() {
    let args = ['component-test', 'x-foo'];

    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => generateFakePackageManifest('ember-cli-mocha', '0.11.0'))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/integration/components/x-foo-test.js'))
          .to.equal(fixture('component-test/mocha.js'));
      }));
  });

  it('component-test x-foo --unit for mocha', function() {
    let args = ['component-test', 'x-foo', '--unit'];

    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => generateFakePackageManifest('ember-cli-mocha', '0.11.0'))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/components/x-foo-test.js'))
          .to.equal(fixture('component-test/mocha-unit.js'));
      }));
  });

  it('component-test x-foo for mocha v0.12+', function() {
    let args = ['component-test', 'x-foo'];

    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => generateFakePackageManifest('ember-cli-mocha', '0.12.0'))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/integration/components/x-foo-test.js'))
          .to.equal(fixture('component-test/mocha-0.12.js'));
      }));
  });

  it('component-test x-foo --unit for mocha v0.12+', function() {
    let args = ['component-test', 'x-foo', '--unit'];

    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => generateFakePackageManifest('ember-cli-mocha', '0.12.0'))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/components/x-foo-test.js'))
          .to.equal(fixture('component-test/mocha-0.12-unit.js'));
      }));
  });
});
