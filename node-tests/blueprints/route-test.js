'use strict';

const path = require('path');

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerate = blueprintHelpers.emberGenerate;
const emberDestroy = blueprintHelpers.emberDestroy;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const modifyPackages = blueprintHelpers.modifyPackages;
const setupPodConfig = blueprintHelpers.setupPodConfig;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;
const file = chai.file;

const generateFakePackageManifest = require('../helpers/generate-fake-package-manifest');

describe('Blueprint: route', function() {
  setupTestHooks(this);

  it('route foo', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['route', 'foo'], (_file) => {
        expect(_file('app/routes/foo.js'))
          .to.contain('import Route from \'@ember/routing/route\';')
          .to.contain('export default Route.extend({\n});');

        expect(_file('app/templates/foo.hbs'))
          .to.equal('{{outlet}}');

        expect(_file('tests/unit/routes/foo-test.js'))
          .to.contain('import { moduleFor, test } from \'ember-qunit\';')
          .to.contain('moduleFor(\'route:foo\'');

        expect(file('app/router.js'))
          .to.contain('this.route(\'foo\')');
      }))
      .then(() => expect(file('app/router.js'))
        .to.not.contain('this.route(\'foo\')'));
  });

  it('route foo with --skip-router', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['route', 'foo', '--skip-router'], (_file) => {
        expect(_file('app/routes/foo.js')).to.exist;
        expect(_file('app/templates/foo.hbs')).to.exist;
        expect(_file('tests/unit/routes/foo-test.js')).to.exist;
        expect(file('app/router.js')).to.not.contain('this.route(\'foo\')');
      }))
      .then(() => expect(file('app/router.js')).to.not.contain('this.route(\'foo\')'));
  });

  it('route foo with --path', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['route', 'foo', '--path=:foo_id/show'], (_file) => {
        expect(_file('app/routes/foo.js'))
          .to.contain('import Route from \'@ember/routing/route\';')
          .to.contain('export default Route.extend({\n});');

        expect(_file('app/templates/foo.hbs'))
          .to.equal('{{outlet}}');

        expect(_file('tests/unit/routes/foo-test.js'))
          .to.contain('import { moduleFor, test } from \'ember-qunit\';')
          .to.contain('moduleFor(\'route:foo\'');

        expect(file('app/router.js'))
          .to.contain('this.route(\'foo\', {')
          .to.contain('path: \':foo_id/show\'')
          .to.contain('});');
      }))
      .then(() => expect(file('app/router.js'))
        .to.not.contain('this.route(\'foo\'')
        .to.not.contain('path: \':foo_id/show\''));
  });

  it('route --reset-namespace', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['route', 'parent/child', '--reset-namespace'], (_file) => {
        expect(_file('app/routes/child.js'))
          .to.contain('import Route from \'@ember/routing/route\';')
          .to.contain('export default Route.extend({\n});');

        expect(_file('app/templates/child.hbs'))
          .to.equal('{{outlet}}');

        expect(_file('tests/unit/routes/child-test.js'))
          .to.contain('import { moduleFor, test } from \'ember-qunit\';')
          .to.contain('moduleFor(\'route:child\'');

        expect(file('app/router.js'))
          .to.contain('this.route(\'parent\', {')
          .to.contain('this.route(\'child\', {')
          .to.contain('resetNamespace: true')
          .to.contain('});');
      }));
  });

  it('route --reset-namespace --pod', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['route', 'parent/child', '--reset-namespace', '--pod'], (_file) => {
        expect(_file('app/child/route.js'))
          .to.contain('import Route from \'@ember/routing/route\';')
          .to.contain('export default Route.extend({\n});');

        expect(_file('app/child/template.hbs'))
          .to.equal('{{outlet}}');

        expect(_file('tests/unit/child/route-test.js'))
          .to.contain('import { moduleFor, test } from \'ember-qunit\';')
          .to.contain('moduleFor(\'route:child\'');

        expect(file('app/router.js'))
          .to.contain('this.route(\'parent\', {')
          .to.contain('this.route(\'child\', {')
          .to.contain('resetNamespace: true')
          .to.contain('});');
      }));
  });

  it('route index', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['route', 'index'], (_file) => {
        expect(_file('app/routes/index.js')).to.exist;
        expect(_file('app/templates/index.hbs')).to.exist;
        expect(_file('tests/unit/routes/index-test.js')).to.exist;
        expect(file('app/router.js')).to.not.contain('this.route(\'index\')');
      }))
      .then(() => expect(file('app/router.js')).to.not.contain('this.route(\'index\')'));
  });

  it('route application', function() {
    return emberNew()
      .then(() => emberGenerate(['route', 'application']))
      .then(() => expect(file('app/router.js')).to.not.contain('this.route(\'application\')'));
  });

  it('route basic isn\'t added to router', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['route', 'basic'], (_file) => {
        expect(_file('app/routes/basic.js')).to.exist;
        expect(file('app/router.js')).to.not.contain('this.route(\'basic\')');
      }))
      .then(() => expect(file('app/router.js')).to.not.contain('this.route(\'basic\')'));
  });

  it('in-addon route foo', function() {
    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(['route', 'foo'], (_file) => {
        expect(_file('addon/routes/foo.js'))
          .to.contain('import Route from \'@ember/routing/route\';')
          .to.contain('export default Route.extend({\n});');

        expect(_file('addon/templates/foo.hbs'))
          .to.equal('{{outlet}}');

        expect(_file('app/routes/foo.js'))
          .to.contain('export { default } from \'my-addon/routes/foo\';');

        expect(_file('app/templates/foo.js'))
          .to.contain('export { default } from \'my-addon/templates/foo\';');

        expect(_file('tests/unit/routes/foo-test.js'))
          .to.contain('import { moduleFor, test } from \'ember-qunit\';')
          .to.contain('moduleFor(\'route:foo\'');

        expect(file('tests/dummy/app/router.js'))
          .to.not.contain('this.route(\'foo\')');
      }))
      .then(() => expect(file('tests/dummy/app/router.js'))
        .to.not.contain('this.route(\'foo\')'));
  });

  it('in-addon route foo/bar', function() {
    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(['route', 'foo/bar'], (_file) => {
        expect(_file('addon/routes/foo/bar.js'))
          .to.contain('import Route from \'@ember/routing/route\';')
          .to.contain('export default Route.extend({\n});');

        expect(_file('addon/templates/foo/bar.hbs'))
          .to.equal('{{outlet}}');

        expect(_file('app/routes/foo/bar.js'))
          .to.contain('export { default } from \'my-addon/routes/foo/bar\';');

        expect(_file('app/templates/foo/bar.js'))
          .to.contain('export { default } from \'my-addon/templates/foo/bar\';');

        expect(_file('tests/unit/routes/foo/bar-test.js'))
          .to.contain('import { moduleFor, test } from \'ember-qunit\';')
          .to.contain('moduleFor(\'route:foo/bar\'');

        expect(file('tests/dummy/app/router.js'))
          .to.not.contain('this.route(\'bar\')');
      }))
      .then(() => expect(file('tests/dummy/app/router.js'))
        .to.not.contain('this.route(\'bar\')'));
  });

  it('dummy route foo', function() {
    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(['route', 'foo', '--dummy'], (_file) => {
        expect(_file('tests/dummy/app/routes/foo.js'))
          .to.contain('import Route from \'@ember/routing/route\';')
          .to.contain('export default Route.extend({\n});');

        expect(_file('tests/dummy/app/templates/foo.hbs'))
          .to.equal('{{outlet}}');

        expect(_file('app/routes/foo.js')).to.not.exist;
        expect(_file('app/templates/foo.hbs')).to.not.exist;
        expect(_file('tests/unit/routes/foo-test.js')).to.not.exist;

        expect(file('tests/dummy/app/router.js'))
          .to.contain('this.route(\'foo\')');
      }))
      .then(() => expect(file('tests/dummy/app/router.js'))
        .to.not.contain('this.route(\'foo\')'));
  });

  it('dummy route foo/bar', function() {
    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(['route', 'foo/bar', '--dummy'], (_file) => {
        expect(_file('tests/dummy/app/routes/foo/bar.js'))
          .to.contain('import Route from \'@ember/routing/route\';')
          .to.contain('export default Route.extend({\n});');

        expect(_file('tests/dummy/app/templates/foo/bar.hbs'))
          .to.equal('{{outlet}}');

        expect(_file('app/routes/foo/bar.js')).to.not.exist;
        expect(_file('app/templates/foo/bar.hbs')).to.not.exist;
        expect(_file('tests/unit/routes/foo/bar-test.js')).to.not.exist;

        expect(file('tests/dummy/app/router.js'))
          .to.contain('this.route(\'foo\', function() {')
          .to.contain('this.route(\'bar\')');
      }))
      .then(() => expect(file('tests/dummy/app/router.js'))
        .to.not.contain('this.route(\'bar\')'));
  });

  it('in-repo-addon route foo', function() {
    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(['route', 'foo', '--in-repo-addon=my-addon'], (_file) => {
        expect(_file('lib/my-addon/addon/routes/foo.js'))
          .to.contain('import Route from \'@ember/routing/route\';')
          .to.contain('export default Route.extend({\n});');

        expect(_file('lib/my-addon/addon/templates/foo.hbs'))
          .to.equal('{{outlet}}');

        expect(_file('lib/my-addon/app/routes/foo.js'))
          .to.contain('export { default } from \'my-addon/routes/foo\';');

        expect(_file('lib/my-addon/app/templates/foo.js'))
          .to.contain('export { default } from \'my-addon/templates/foo\';');

        expect(_file('tests/unit/routes/foo-test.js'))
          .to.contain('import { moduleFor, test } from \'ember-qunit\';')
          .to.contain('moduleFor(\'route:foo\'');
      }));
  });

  it('in-repo-addon route foo/bar', function() {
    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(['route', 'foo/bar', '--in-repo-addon=my-addon'], (_file) => {
        expect(_file('lib/my-addon/addon/routes/foo/bar.js'))
          .to.contain('import Route from \'@ember/routing/route\';')
          .to.contain('export default Route.extend({\n});');

        expect(_file('lib/my-addon/addon/templates/foo/bar.hbs'))
          .to.equal('{{outlet}}');

        expect(_file('lib/my-addon/app/routes/foo/bar.js'))
          .to.contain('export { default } from \'my-addon/routes/foo/bar\';');

        expect(_file('lib/my-addon/app/templates/foo/bar.js'))
          .to.contain('export { default } from \'my-addon/templates/foo/bar\';');

        expect(_file('tests/unit/routes/foo/bar-test.js'))
          .to.contain('import { moduleFor, test } from \'ember-qunit\';')
          .to.contain('moduleFor(\'route:foo/bar\'');
      }));
  });

  it('route foo --pod', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['route', 'foo', '--pod'], (_file) => {
        expect(_file('app/foo/route.js'))
          .to.contain('import Route from \'@ember/routing/route\';')
          .to.contain('export default Route.extend({\n});');

        expect(_file('app/foo/template.hbs'))
          .to.equal('{{outlet}}');

        expect(_file('tests/unit/foo/route-test.js'))
          .to.contain('import { moduleFor, test } from \'ember-qunit\';')
          .to.contain('moduleFor(\'route:foo\'');

        expect(file('app/router.js'))
          .to.contain('this.route(\'foo\')');
      }))
      .then(() => expect(file('app/router.js'))
        .to.not.contain('this.route(\'foo\')'));
  });

  it('route foo --pod with --path', function() {
    return emberNew()
      .then(() => emberGenerate(['route', 'foo', '--pod', '--path=:foo_id/show']))
      .then(() => expect(file('app/router.js'))
        .to.contain('this.route(\'foo\', {')
        .to.contain('path: \':foo_id/show\'')
        .to.contain('});'))

      .then(() => emberDestroy(['route', 'foo', '--pod', '--path=:foo_id/show']))
      .then(() => expect(file('app/router.js'))
        .to.not.contain('this.route(\'foo\', {')
        .to.not.contain('path: \':foo_id/show\''));
  });

  it('route foo --pod podModulePrefix', function() {
    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(['route', 'foo', '--pod'], (_file) => {
        expect(_file('app/pods/foo/route.js'))
          .to.contain('import Route from \'@ember/routing/route\';')
          .to.contain('export default Route.extend({\n});');

        expect(_file('app/pods/foo/template.hbs'))
          .to.equal('{{outlet}}');

        expect(_file('tests/unit/pods/foo/route-test.js'))
          .to.contain('import { moduleFor, test } from \'ember-qunit\';')
          .to.contain('moduleFor(\'route:foo\'');

        expect(file('app/router.js'))
          .to.contain('this.route(\'foo\')');
      }))
      .then(() => expect(file('app/router.js'))
        .to.not.contain('this.route(\'foo\')'));
  });

  it('route index --pod', function() {
    return emberNew()
      .then(() => emberGenerate(['route', 'index', '--pod']))
      .then(() => expect(file('app/router.js'))
        .to.not.contain('this.route(\'index\')'));
  });

  it('route application --pod', function() {
    return emberNew()
      .then(() => emberGenerate(['route', 'application', '--pod']))
      .then(() => expect(file('app/application/route.js')).to.exist)
      .then(() => expect(file('app/application/template.hbs')).to.exist)
      .then(() => expect(file('app/router.js')).to.not.contain('this.route(\'application\')'));
  });

  it('route basic --pod isn\'t added to router', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['route', 'basic', '--pod'], (_file) => {
        expect(_file('app/basic/route.js')).to.exist;
        expect(file('app/router.js'))
          .to.not.contain('this.route(\'index\')');
      }));
  });

  it('in-addon route foo --pod', function() {
    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(['route', 'foo', '--pod'], (_file) => {
        expect(_file('addon/foo/route.js'))
          .to.contain('import Route from \'@ember/routing/route\';')
          .to.contain('export default Route.extend({\n});');

        expect(_file('addon/foo/template.hbs'))
          .to.equal('{{outlet}}');

        expect(_file('app/foo/route.js'))
          .to.contain('export { default } from \'my-addon/foo/route\';');

        expect(_file('app/foo/template.js'))
          .to.contain('export { default } from \'my-addon/foo/template\';');

        expect(_file('tests/unit/foo/route-test.js'))
          .to.contain('import { moduleFor, test } from \'ember-qunit\';')
          .to.contain('moduleFor(\'route:foo\'');
      }));
  });

  it('route-test foo', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['route-test', 'foo'], (_file) => {
        expect(_file('tests/unit/routes/foo-test.js'))
          .to.contain('import { moduleFor, test } from \'ember-qunit\';')
          .to.contain('moduleFor(\'route:foo\'');
      }));
  });

  it('in-addon route-test foo', function() {
    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(['route-test', 'foo'], (_file) => {
        expect(_file('tests/unit/routes/foo-test.js'))
          .to.contain('import { moduleFor, test } from \'ember-qunit\';')
          .to.contain('moduleFor(\'route:foo\'');
      }));
  });

  it('route-test foo for mocha', function() {
    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => generateFakePackageManifest('ember-cli-mocha', '0.11.0'))
      .then(() => emberGenerateDestroy(['route-test', 'foo'], (_file) => {
        expect(_file('tests/unit/routes/foo-test.js'))
          .to.contain('import { describeModule, it } from \'ember-mocha\';')
          .to.contain('describeModule(\'route:foo\', \'Unit | Route | foo\'');
      }));
  });

  it('route-test foo for mocha v0.12+', function() {
    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => generateFakePackageManifest('ember-cli-mocha', '0.12.0'))
      .then(() => emberGenerateDestroy(['route-test', 'foo'], (_file) => {
        expect(_file('tests/unit/routes/foo-test.js'))
          .to.contain('import { describe, it } from \'mocha\';')
          .to.contain('import { setupTest } from \'ember-mocha\';')
          .to.contain('describe(\'Unit | Route | foo\', function() {')
          .to.contain('setupTest(\'route:foo\',');
      }));
  });
});
