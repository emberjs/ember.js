'use strict';

var fs                 = require('fs-extra');
var path               = require('path');
var RSVP               = require('rsvp');
var remove             = RSVP.denodeify(fs.remove);

var blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
var setupTestHooks = blueprintHelpers.setupTestHooks;
var emberNew = blueprintHelpers.emberNew;
var emberGenerate = blueprintHelpers.emberGenerate;
var emberDestroy = blueprintHelpers.emberDestroy;
var emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
var modifyPackages = blueprintHelpers.modifyPackages;
var setupPodConfig = blueprintHelpers.setupPodConfig;

var chai = require('ember-cli-blueprint-test-helpers/chai');
var expect = chai.expect;
var file = chai.file;

var generateFakePackageManifest = require('../helpers/generate-fake-package-manifest');

describe('Acceptance: ember generate and destroy route', function() {
  setupTestHooks(this);

  it('route foo', function() {
    var args = ['route', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, (_file) => {
        expect(_file('app/routes/foo.js'))
          .to.contain('import Ember from \'ember\';')
          .to.contain('export default Ember.Route.extend({\n});');

        expect(_file('app/templates/foo.hbs'))
          .to.contain('{{outlet}}');

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
    var args = ['route', 'foo', '--skip-router'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, (_file) => {
        expect(_file('app/routes/foo.js')).to.exist;
        expect(_file('app/templates/foo.hbs')).to.exist;
        expect(_file('tests/unit/routes/foo-test.js')).to.exist;
        expect(file('app/router.js')).to.not.contain('this.route(\'foo\')');
      }))
      .then(() => expect(file('app/router.js')).to.not.contain('this.route(\'foo\')'));
  });

  it('route foo with --path', function() {
    var args = ['route', 'foo', '--path=:foo_id/show'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, (_file) => {
        expect(_file('app/routes/foo.js'))
          .to.contain('import Ember from \'ember\';')
          .to.contain('export default Ember.Route.extend({\n});');

        expect(_file('app/templates/foo.hbs'))
          .to.contain('{{outlet}}');

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
    var args = ['route', 'parent/child', '--reset-namespace'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, (_file) => {
        expect(_file('app/routes/child.js'))
          .to.contain('import Ember from \'ember\';')
          .to.contain('export default Ember.Route.extend({\n});');

        expect(_file('app/templates/child.hbs'))
          .to.contain('{{outlet}}');

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
    var args = ['route', 'parent/child', '--reset-namespace', '--pod'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, (_file) => {
        expect(_file('app/child/route.js'))
          .to.contain('import Ember from \'ember\';')
          .to.contain('export default Ember.Route.extend({\n});');

        expect(_file('app/child/template.hbs'))
          .to.contain('{{outlet}}');

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
    var args = ['route', 'index'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, (_file) => {
        expect(_file('app/routes/index.js')).to.exist;
        expect(_file('app/templates/index.hbs')).to.exist;
        expect(_file('tests/unit/routes/index-test.js')).to.exist;
        expect(file('app/router.js')).to.not.contain('this.route(\'index\')');
      }))
      .then(() => expect(file('app/router.js')).to.not.contain('this.route(\'index\')'));
  });

  it('route application', function() {
    var args = ['route', 'application'];

    return emberNew()
      .then(() => remove(path.resolve('app/templates/application.hbs')))
      .then(() => emberGenerate(args))
      .then(() => expect(file('app/router.js')).to.not.contain('this.route(\'application\')'));
  });

  it('route basic isn\'t added to router', function() {
    var args = ['route', 'basic'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, (_file) => {
        expect(_file('app/routes/basic.js')).to.exist;
        expect(file('app/router.js')).to.not.contain('this.route(\'basic\')');
      }))
      .then(() => expect(file('app/router.js')).to.not.contain('this.route(\'basic\')'));
  });

  it('in-addon route foo', function() {
    var args = ['route', 'foo'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, (_file) => {
        expect(_file('addon/routes/foo.js'))
          .to.contain('import Ember from \'ember\';')
          .to.contain('export default Ember.Route.extend({\n});');

        expect(_file('addon/templates/foo.hbs'))
          .to.contain('{{outlet}}');

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
    var args = ['route', 'foo/bar'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, (_file) => {
        expect(_file('addon/routes/foo/bar.js'))
          .to.contain('import Ember from \'ember\';')
          .to.contain('export default Ember.Route.extend({\n});');

        expect(_file('addon/templates/foo/bar.hbs'))
          .to.contain('{{outlet}}');

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
    var args = ['route', 'foo', '--dummy'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, (_file) => {
        expect(_file('tests/dummy/app/routes/foo.js'))
          .to.contain('import Ember from \'ember\';')
          .to.contain('export default Ember.Route.extend({\n});');

        expect(_file('tests/dummy/app/templates/foo.hbs'))
          .to.contain('{{outlet}}');

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
    var args = ['route', 'foo/bar', '--dummy'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, (_file) => {
        expect(_file('tests/dummy/app/routes/foo/bar.js'))
          .to.contain('import Ember from \'ember\';')
          .to.contain('export default Ember.Route.extend({\n});');

        expect(_file('tests/dummy/app/templates/foo/bar.hbs'))
          .to.contain('{{outlet}}');

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
    var args = ['route', 'foo', '--in-repo-addon=my-addon'];

    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(args, (_file) => {
        expect(_file('lib/my-addon/addon/routes/foo.js'))
          .to.contain('import Ember from \'ember\';')
          .to.contain('export default Ember.Route.extend({\n});');

        expect(_file('lib/my-addon/addon/templates/foo.hbs'))
          .to.contain('{{outlet}}');

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
    var args = ['route', 'foo/bar', '--in-repo-addon=my-addon'];

    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(args, (_file) => {
        expect(_file('lib/my-addon/addon/routes/foo/bar.js'))
          .to.contain('import Ember from \'ember\';')
          .to.contain('export default Ember.Route.extend({\n});');

        expect(_file('lib/my-addon/addon/templates/foo/bar.hbs'))
          .to.contain('{{outlet}}');

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
    var args = ['route', 'foo', '--pod'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, (_file) => {
        expect(_file('app/foo/route.js'))
          .to.contain('import Ember from \'ember\';')
          .to.contain('export default Ember.Route.extend({\n});');

        expect(_file('app/foo/template.hbs'))
          .to.contain('{{outlet}}');

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
    var args = ['route', 'foo', '--pod', '--path=:foo_id/show'];

    return emberNew()
      .then(() => emberGenerate(args))
      .then(() => expect(file('app/router.js'))
        .to.contain('this.route(\'foo\', {')
        .to.contain('path: \':foo_id/show\'')
        .to.contain('});'))

      .then(() => emberDestroy(args))
      .then(() => expect(file('app/router.js'))
        .to.not.contain('this.route(\'foo\', {')
        .to.not.contain('path: \':foo_id/show\''));
  });

  it('route foo --pod podModulePrefix', function() {
    var args = ['route', 'foo', '--pod'];

    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(args, (_file) => {
        expect(_file('app/pods/foo/route.js'))
          .to.contain('import Ember from \'ember\';')
          .to.contain('export default Ember.Route.extend({\n});');

        expect(_file('app/pods/foo/template.hbs'))
          .to.contain('{{outlet}}');

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
    var args = ['route', 'index', '--pod'];

    return emberNew()
      .then(() => emberGenerate(args))
      .then(() => expect(file('app/router.js'))
        .to.not.contain('this.route(\'index\')'));
  });

  it('route application --pod', function() {
    var args = ['route', 'application', '--pod'];

    return emberNew()
      .then(() => remove(path.resolve('app/templates/application.hbs')))
      .then(() => emberGenerate(args))
      .then(() => expect(file('app/application/route.js')).to.exist)
      .then(() => expect(file('app/application/template.hbs')).to.exist)
      .then(() => expect(file('app/router.js')).to.not.contain('this.route(\'application\')'));
  });

  it('route basic --pod isn\'t added to router', function() {
    var args = ['route', 'basic', '--pod'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, (_file) => {
        expect(_file('app/basic/route.js')).to.exist;
        expect(file('app/router.js'))
          .to.not.contain('this.route(\'index\')');
      }));
  });

  it('in-addon route foo --pod', function() {
    var args = ['route', 'foo', '--pod'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, (_file) => {
        expect(_file('addon/foo/route.js'))
          .to.contain('import Ember from \'ember\';')
          .to.contain('export default Ember.Route.extend({\n});');

        expect(_file('addon/foo/template.hbs'))
          .to.contain('{{outlet}}');

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
    var args = ['route-test', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, (_file) => {
        expect(_file('tests/unit/routes/foo-test.js'))
          .to.contain('import { moduleFor, test } from \'ember-qunit\';')
          .to.contain('moduleFor(\'route:foo\'');
      }));
  });

  it('in-addon route-test foo', function() {
    var args = ['route-test', 'foo'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, (_file) => {
        expect(_file('tests/unit/routes/foo-test.js'))
          .to.contain('import { moduleFor, test } from \'ember-qunit\';')
          .to.contain('moduleFor(\'route:foo\'');
      }));
  });

  it('route-test foo for mocha', function() {
    var args = ['route-test', 'foo'];

    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => generateFakePackageManifest('ember-cli-mocha', '0.11.0'))
      .then(() => emberGenerateDestroy(args, (_file) => {
        expect(_file('tests/unit/routes/foo-test.js'))
          .to.contain('import { describeModule, it } from \'ember-mocha\';')
          .to.contain('describeModule(\'route:foo\', \'Unit | Route | foo\'');
      }));
  });

  it('route-test foo for mocha v0.12+', function() {
    var args = ['route-test', 'foo'];

    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => generateFakePackageManifest('ember-cli-mocha', '0.12.0'))
      .then(() => emberGenerateDestroy(args, (_file) => {
        expect(_file('tests/unit/routes/foo-test.js'))
          .to.contain('import { describe, it } from \'mocha\';')
          .to.contain('import { setupTest } from \'ember-mocha\';')
          .to.contain('describe(\'Unit | Route | foo\', function() {')
          .to.contain('setupTest(\'route:foo\',');
      }));
  });
});
