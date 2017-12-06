'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const modifyPackages = blueprintHelpers.modifyPackages;
const setupPodConfig = blueprintHelpers.setupPodConfig;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

describe('Blueprint: mixin', function() {
  setupTestHooks(this);

  it('mixin foo', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['mixin', 'foo'], _file => {
        expect(_file('app/mixins/foo.js'))
          .to.contain('import Mixin from \'@ember/object/mixin\';')
          .to.contain('export default Mixin.create({\n});');

        expect(_file('tests/unit/mixins/foo-test.js'))
          .to.contain("import FooMixin from 'my-app/mixins/foo';");
      }));
  });

  it('mixin foo/bar', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['mixin', 'foo/bar'], _file => {
        expect(_file('app/mixins/foo/bar.js'))
          .to.contain('import Mixin from \'@ember/object/mixin\';')
          .to.contain('export default Mixin.create({\n});');

        expect(_file('tests/unit/mixins/foo/bar-test.js'))
          .to.contain("import FooBarMixin from 'my-app/mixins/foo/bar';");
      }));
  });

  it('mixin foo/bar/baz', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['mixin', 'foo/bar/baz'], _file => {
        expect(_file('tests/unit/mixins/foo/bar/baz-test.js'))
          .to.contain("import FooBarBazMixin from 'my-app/mixins/foo/bar/baz';");
      }));
  });

  it('in-addon mixin foo', function() {
    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(['mixin', 'foo'], _file => {
        expect(_file('addon/mixins/foo.js'))
          .to.contain('import Mixin from \'@ember/object/mixin\';')
          .to.contain('export default Mixin.create({\n});');

        expect(_file('tests/unit/mixins/foo-test.js'))
          .to.contain("import FooMixin from 'my-addon/mixins/foo';");

        expect(_file('app/mixins/foo.js'))
          .to.not.exist;
      }));
  });

  it('in-addon mixin foo/bar', function() {
    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(['mixin', 'foo/bar'], _file => {
        expect(_file('addon/mixins/foo/bar.js'))
          .to.contain('import Mixin from \'@ember/object/mixin\';')
          .to.contain('export default Mixin.create({\n});');

        expect(_file('tests/unit/mixins/foo/bar-test.js'))
          .to.contain("import FooBarMixin from 'my-addon/mixins/foo/bar';");

        expect(_file('app/mixins/foo/bar.js'))
          .to.not.exist;
      }));
  });

  it('in-addon mixin foo/bar/baz', function() {
    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(['mixin', 'foo/bar/baz'], _file => {
        expect(_file('addon/mixins/foo/bar/baz.js'))
          .to.contain('import Mixin from \'@ember/object/mixin\';')
          .to.contain('export default Mixin.create({\n});');

        expect(_file('tests/unit/mixins/foo/bar/baz-test.js'))
          .to.contain("import FooBarBazMixin from 'my-addon/mixins/foo/bar/baz';");

        expect(_file('app/mixins/foo/bar/baz.js'))
          .to.not.exist;
      }));
  });

  it('in-repo-addon mixin foo', function() {
    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(['mixin', 'foo', '--in-repo-addon=my-addon'], _file => {
        expect(_file('lib/my-addon/addon/mixins/foo.js'))
          .to.contain('import Mixin from \'@ember/object/mixin\';')
          .to.contain('export default Mixin.create({\n});');

        expect(_file('tests/unit/mixins/foo-test.js'))
          .to.contain("import FooMixin from 'my-addon/mixins/foo';");
      }));
  });

  it('in-repo-addon mixin foo/bar', function() {
    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(['mixin', 'foo/bar', '--in-repo-addon=my-addon'], _file => {
        expect(_file('lib/my-addon/addon/mixins/foo/bar.js'))
          .to.contain('import Mixin from \'@ember/object/mixin\';')
          .to.contain('export default Mixin.create({\n});');

        expect(_file('tests/unit/mixins/foo/bar-test.js'))
          .to.contain("import FooBarMixin from 'my-addon/mixins/foo/bar';");
      }));
  });

  it('in-repo-addon mixin foo/bar/baz', function() {
    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(['mixin', 'foo/bar/baz', '--in-repo-addon=my-addon'], _file => {
        expect(_file('tests/unit/mixins/foo/bar/baz-test.js'))
          .to.contain("import FooBarBazMixin from 'my-addon/mixins/foo/bar/baz';");
      }));
  });

  /* Pod tests */

  it('mixin foo --pod', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['mixin', 'foo', '--pod'], _file => {
        expect(_file('app/mixins/foo.js'))
          .to.contain('import Mixin from \'@ember/object/mixin\';')
          .to.contain('export default Mixin.create({\n});');

        expect(_file('tests/unit/mixins/foo-test.js'))
          .to.contain("import FooMixin from 'my-app/mixins/foo';");
      }));
  });

  it('mixin foo --pod podModulePrefix', function() {
    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(['mixin', 'foo', '--pod'], _file => {
        expect(_file('app/mixins/foo.js'))
          .to.contain('import Mixin from \'@ember/object/mixin\';')
          .to.contain('export default Mixin.create({\n});');

        expect(_file('tests/unit/mixins/foo-test.js'))
          .to.contain("import FooMixin from 'my-app/mixins/foo';");
      }));
  });

  it('mixin foo/bar --pod', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['mixin', 'foo/bar', '--pod'], _file => {
        expect(_file('app/mixins/foo/bar.js'))
          .to.contain('import Mixin from \'@ember/object/mixin\';')
          .to.contain('export default Mixin.create({\n});');

        expect(_file('tests/unit/mixins/foo/bar-test.js'))
          .to.contain("import FooBarMixin from 'my-app/mixins/foo/bar';");
      }));
  });

  it('mixin foo/bar --pod podModulePrefix', function() {
    return emberNew()
      .then(() => setupPodConfig({ podModulePrefix: true }))
      .then(() => emberGenerateDestroy(['mixin', 'foo/bar', '--pod'], _file => {
        expect(_file('app/mixins/foo/bar.js'))
          .to.contain('import Mixin from \'@ember/object/mixin\';')
          .to.contain('export default Mixin.create({\n});');

        expect(_file('tests/unit/mixins/foo/bar-test.js'))
          .to.contain("import FooBarMixin from 'my-app/mixins/foo/bar';");
      }));
  });

  it('mixin foo/bar/baz --pod', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['mixin', 'foo/bar/baz', '--pod'], _file => {
        expect(_file('tests/unit/mixins/foo/bar/baz-test.js'))
          .to.contain("import FooBarBazMixin from 'my-app/mixins/foo/bar/baz';");
      }));
  });

  it('mixin-test foo', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['mixin-test', 'foo'], _file => {
        expect(_file('tests/unit/mixins/foo-test.js'))
          .to.contain("import FooMixin from 'my-app/mixins/foo';");
      }));
  });

  it('in-addon mixin-test foo', function() {
    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(['mixin-test', 'foo'], _file => {
        expect(_file('tests/unit/mixins/foo-test.js'))
          .to.contain("import FooMixin from 'my-addon/mixins/foo';");
      }));
  });

  it('mixin-test foo for mocha', function() {
    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => emberGenerateDestroy(['mixin-test', 'foo'], _file => {
        expect(_file('tests/unit/mixins/foo-test.js'))
          .to.contain("import { describe, it } from 'mocha';")
          .to.contain("import FooMixin from 'my-app/mixins/foo';")
          .to.contain("describe('Unit | Mixin | foo', function() {");
      }));
  });
});
