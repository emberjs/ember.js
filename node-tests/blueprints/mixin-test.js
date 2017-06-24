'use strict';

var blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
var setupTestHooks = blueprintHelpers.setupTestHooks;
var emberNew = blueprintHelpers.emberNew;
var emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
var modifyPackages = blueprintHelpers.modifyPackages;
var setupPodConfig = blueprintHelpers.setupPodConfig;

var chai = require('ember-cli-blueprint-test-helpers/chai');
var expect = chai.expect;

describe('Acceptance: ember generate and destroy mixin', function() {
  setupTestHooks(this);

  it('mixin foo', function() {
    var args = ['mixin', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/mixins/foo.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain('export default Mixin.create({\n});');

        expect(_file('tests/unit/mixins/foo-test.js'))
          .to.contain("import FooMixin from 'my-app/mixins/foo';");
      }));
  });

  it('mixin foo/bar', function() {
    var args = ['mixin', 'foo/bar'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/mixins/foo/bar.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain('export default Mixin.create({\n});');

        expect(_file('tests/unit/mixins/foo/bar-test.js'))
          .to.contain("import FooBarMixin from 'my-app/mixins/foo/bar';");
      }));
  });

  it('mixin foo/bar/baz', function() {
    var args = ['mixin', 'foo/bar/baz'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/mixins/foo/bar/baz-test.js'))
          .to.contain("import FooBarBazMixin from 'my-app/mixins/foo/bar/baz';");
      }));
  });

  it('in-addon mixin foo', function() {
    var args = ['mixin', 'foo'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('addon/mixins/foo.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain('export default Mixin.create({\n});');

        expect(_file('tests/unit/mixins/foo-test.js'))
          .to.contain("import FooMixin from 'my-addon/mixins/foo';");

        expect(_file('app/mixins/foo.js'))
          .to.not.exist;
      }));
  });

  it('in-addon mixin foo/bar', function() {
    var args = ['mixin', 'foo/bar'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('addon/mixins/foo/bar.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain('export default Mixin.create({\n});');

        expect(_file('tests/unit/mixins/foo/bar-test.js'))
          .to.contain("import FooBarMixin from 'my-addon/mixins/foo/bar';");

        expect(_file('app/mixins/foo/bar.js'))
          .to.not.exist;
      }));
  });

  it('in-addon mixin foo/bar/baz', function() {
    var args = ['mixin', 'foo/bar/baz'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('addon/mixins/foo/bar/baz.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain('export default Mixin.create({\n});');

        expect(_file('tests/unit/mixins/foo/bar/baz-test.js'))
          .to.contain("import FooBarBazMixin from 'my-addon/mixins/foo/bar/baz';");

        expect(_file('app/mixins/foo/bar/baz.js'))
          .to.not.exist;
      }));
  });

  it('in-repo-addon mixin foo', function() {
    var args = ['mixin', 'foo', '--in-repo-addon=my-addon'];

    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('lib/my-addon/addon/mixins/foo.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain('export default Mixin.create({\n});');

        expect(_file('tests/unit/mixins/foo-test.js'))
          .to.contain("import FooMixin from 'my-addon/mixins/foo';");
      }));
  });

  it('in-repo-addon mixin foo/bar', function() {
    var args = ['mixin', 'foo/bar', '--in-repo-addon=my-addon'];

    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('lib/my-addon/addon/mixins/foo/bar.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain('export default Mixin.create({\n});');

        expect(_file('tests/unit/mixins/foo/bar-test.js'))
          .to.contain("import FooBarMixin from 'my-addon/mixins/foo/bar';");
      }));
  });

  it('in-repo-addon mixin foo/bar/baz', function() {
    var args = ['mixin', 'foo/bar/baz', '--in-repo-addon=my-addon'];

    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/mixins/foo/bar/baz-test.js'))
          .to.contain("import FooBarBazMixin from 'my-addon/mixins/foo/bar/baz';");
      }));
  });

  /* Pod tests */

  it('mixin foo --pod', function() {
    var args = ['mixin', 'foo', '--pod'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/mixins/foo.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain('export default Mixin.create({\n});');

        expect(_file('tests/unit/mixins/foo-test.js'))
          .to.contain("import FooMixin from 'my-app/mixins/foo';");
      }));
  });

  it('mixin foo --pod podModulePrefix', function() {
    var args = ['mixin', 'foo', '--pod'];

    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/mixins/foo.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain('export default Mixin.create({\n});');

        expect(_file('tests/unit/mixins/foo-test.js'))
          .to.contain("import FooMixin from 'my-app/mixins/foo';");
      }));
  });

  it('mixin foo/bar --pod', function() {
    var args = ['mixin', 'foo/bar', '--pod'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/mixins/foo/bar.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain('export default Mixin.create({\n});');

        expect(_file('tests/unit/mixins/foo/bar-test.js'))
          .to.contain("import FooBarMixin from 'my-app/mixins/foo/bar';");
      }));
  });

  it('mixin foo/bar --pod podModulePrefix', function() {
    var args = ['mixin', 'foo/bar', '--pod'];

    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/mixins/foo/bar.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain('export default Mixin.create({\n});');

        expect(_file('tests/unit/mixins/foo/bar-test.js'))
          .to.contain("import FooBarMixin from 'my-app/mixins/foo/bar';");
      }));
  });

  it('mixin foo/bar/baz --pod', function() {
    var args = ['mixin', 'foo/bar/baz', '--pod'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/mixins/foo/bar/baz-test.js'))
          .to.contain("import FooBarBazMixin from 'my-app/mixins/foo/bar/baz';");
      }));
  });

  it('mixin-test foo', function() {
    var args = ['mixin-test', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/mixins/foo-test.js'))
          .to.contain("import FooMixin from 'my-app/mixins/foo';");
      }));
  });

  it('in-addon mixin-test foo', function() {
    var args = ['mixin-test', 'foo'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/mixins/foo-test.js'))
          .to.contain("import FooMixin from 'my-addon/mixins/foo';");
      }));
  });

  it('mixin-test foo for mocha', function() {
    var args = ['mixin-test', 'foo'];

    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/mixins/foo-test.js'))
          .to.contain("import { describe, it } from 'mocha';")
          .to.contain("import FooMixin from 'my-app/mixins/foo';")
          .to.contain("describe('Unit | Mixin | foo', function() {");
      }));
  });
});
