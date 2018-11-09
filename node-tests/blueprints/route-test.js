'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerate = blueprintHelpers.emberGenerate;
const emberDestroy = blueprintHelpers.emberDestroy;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const setupPodConfig = blueprintHelpers.setupPodConfig;

const expectError = require('../helpers/expect-error');
const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;
const file = chai.file;
const fs = require('fs-extra');

const generateFakePackageManifest = require('../helpers/generate-fake-package-manifest');
const fixture = require('../helpers/fixture');

describe('Blueprint: route', function() {
  setupTestHooks(this);

  describe('in app', function() {
    beforeEach(function() {
      return emberNew().then(() => generateFakePackageManifest('ember-cli-qunit', '4.1.0'));
    });

    it('route foo', function() {
      return emberGenerateDestroy(['route', 'foo'], _file => {
        expect(_file('app/routes/foo.js')).to.equal(fixture('route/route.js'));

        expect(_file('app/templates/foo.hbs')).to.equal('{{outlet}}');

        expect(_file('tests/unit/routes/foo-test.js')).to.equal(fixture('route-test/default.js'));

        expect(file('app/router.js')).to.contain("this.route('foo')");
      }).then(() => {
        expect(file('app/router.js')).to.not.contain("this.route('foo')");
      });
    });

    it('route foo --skip-router', function() {
      return emberGenerateDestroy(['route', 'foo', '--skip-router'], _file => {
        expect(_file('app/routes/foo.js')).to.exist;
        expect(_file('app/templates/foo.hbs')).to.exist;
        expect(_file('tests/unit/routes/foo-test.js')).to.exist;
        expect(file('app/router.js')).to.not.contain("this.route('foo')");
      }).then(() => {
        expect(file('app/router.js')).to.not.contain("this.route('foo')");
      });
    });

    it('route foo --path=:foo_id/show', function() {
      return emberGenerateDestroy(['route', 'foo', '--path=:foo_id/show'], _file => {
        expect(_file('app/routes/foo.js')).to.equal(fixture('route/route.js'));

        expect(_file('app/templates/foo.hbs')).to.equal('{{outlet}}');

        expect(_file('tests/unit/routes/foo-test.js')).to.equal(fixture('route-test/default.js'));

        expect(file('app/router.js'))
          .to.contain("this.route('foo', {")
          .to.contain("path: ':foo_id/show'")
          .to.contain('});');
      }).then(() => {
        expect(file('app/router.js'))
          .to.not.contain("this.route('foo'")
          .to.not.contain("path: ':foo_id/show'");
      });
    });

    it('route parent/child --reset-namespace', function() {
      return emberGenerateDestroy(['route', 'parent/child', '--reset-namespace'], _file => {
        expect(_file('app/routes/child.js')).to.equal(fixture('route/route-child.js'));

        expect(_file('app/templates/child.hbs')).to.equal('{{outlet}}');

        expect(_file('tests/unit/routes/child-test.js')).to.equal(
          fixture('route-test/default-child.js')
        );

        expect(file('app/router.js'))
          .to.contain("this.route('parent', {")
          .to.contain("this.route('child', {")
          .to.contain('resetNamespace: true')
          .to.contain('});');
      });
    });

    it('route parent/child --reset-namespace --pod', function() {
      return emberGenerateDestroy(
        ['route', 'parent/child', '--reset-namespace', '--pod'],
        _file => {
          expect(_file('app/child/route.js')).to.equal(fixture('route/route-child.js'));

          expect(_file('app/child/template.hbs')).to.equal('{{outlet}}');

          expect(_file('tests/unit/child/route-test.js')).to.equal(
            fixture('route-test/default-child.js')
          );

          expect(file('app/router.js'))
            .to.contain("this.route('parent', {")
            .to.contain("this.route('child', {")
            .to.contain('resetNamespace: true')
            .to.contain('});');
        }
      );
    });

    it('route index', function() {
      return emberGenerateDestroy(['route', 'index'], _file => {
        expect(_file('app/routes/index.js')).to.exist;
        expect(_file('app/templates/index.hbs')).to.exist;
        expect(_file('tests/unit/routes/index-test.js')).to.exist;
        expect(file('app/router.js')).to.not.contain("this.route('index')");
      }).then(() => {
        expect(file('app/router.js')).to.not.contain("this.route('index')");
      });
    });

    it('route application', function() {
      fs.removeSync('app/templates/application.hbs');
      return emberGenerate(['route', 'application']).then(() => {
        expect(file('app/router.js')).to.not.contain("this.route('application')");
      });
    });

    it('route basic', function() {
      return emberGenerateDestroy(['route', 'basic'], _file => {
        expect(_file('app/routes/basic.js')).to.exist;
        expect(file('app/router.js')).to.not.contain("this.route('basic')");
      }).then(() => {
        expect(file('app/router.js')).to.not.contain("this.route('basic')");
      });
    });

    it('route foo --pod', function() {
      return emberGenerateDestroy(['route', 'foo', '--pod'], _file => {
        expect(_file('app/foo/route.js')).to.equal(fixture('route/route.js'));

        expect(_file('app/foo/template.hbs')).to.equal('{{outlet}}');

        expect(_file('tests/unit/foo/route-test.js')).to.equal(fixture('route-test/default.js'));

        expect(file('app/router.js')).to.contain("this.route('foo')");
      }).then(() => {
        expect(file('app/router.js')).to.not.contain("this.route('foo')");
      });
    });

    it('route foo --pod with --path', function() {
      return emberGenerate(['route', 'foo', '--pod', '--path=:foo_id/show'])
        .then(() =>
          expect(file('app/router.js'))
            .to.contain("this.route('foo', {")
            .to.contain("path: ':foo_id/show'")
            .to.contain('});')
        )

        .then(() => emberDestroy(['route', 'foo', '--pod', '--path=:foo_id/show']))
        .then(() =>
          expect(file('app/router.js'))
            .to.not.contain("this.route('foo', {")
            .to.not.contain("path: ':foo_id/show'")
        );
    });

    it('route index --pod', function() {
      return emberGenerate(['route', 'index', '--pod']).then(() =>
        expect(file('app/router.js')).to.not.contain("this.route('index')")
      );
    });

    it('route application --pod', function() {
      return emberGenerate(['route', 'application', '--pod'])
        .then(() => expect(file('app/application/route.js')).to.exist)
        .then(() => expect(file('app/application/template.hbs')).to.exist)
        .then(() => expect(file('app/router.js')).to.not.contain("this.route('application')"));
    });

    it('route basic --pod', function() {
      return emberGenerateDestroy(['route', 'basic', '--pod'], _file => {
        expect(_file('app/basic/route.js')).to.exist;
        expect(file('app/router.js')).to.not.contain("this.route('index')");
      });
    });

    describe('with podModulePrefix', function() {
      beforeEach(function() {
        setupPodConfig({ podModulePrefix: true });
      });

      it('route foo --pod', function() {
        return emberGenerateDestroy(['route', 'foo', '--pod'], _file => {
          expect(_file('app/pods/foo/route.js')).to.equal(fixture('route/route.js'));

          expect(_file('app/pods/foo/template.hbs')).to.equal('{{outlet}}');

          expect(_file('tests/unit/pods/foo/route-test.js')).to.equal(
            fixture('route-test/default.js')
          );

          expect(file('app/router.js')).to.contain("this.route('foo')");
        }).then(() => {
          expect(file('app/router.js')).to.not.contain("this.route('foo')");
        });
      });
    });
  });

  describe('in addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' }).then(() =>
        generateFakePackageManifest('ember-cli-qunit', '4.1.0')
      );
    });

    it('route foo', function() {
      return emberGenerateDestroy(['route', 'foo'], _file => {
        expect(_file('addon/routes/foo.js')).to.equal(fixture('route/route.js'));

        expect(_file('addon/templates/foo.hbs')).to.equal('{{outlet}}');

        expect(_file('app/routes/foo.js')).to.contain(
          "export { default } from 'my-addon/routes/foo';"
        );

        expect(_file('app/templates/foo.js')).to.contain(
          "export { default } from 'my-addon/templates/foo';"
        );

        expect(_file('tests/unit/routes/foo-test.js')).to.equal(fixture('route-test/default.js'));

        expect(file('tests/dummy/app/router.js')).to.not.contain("this.route('foo')");
      }).then(() => {
        expect(file('tests/dummy/app/router.js')).to.not.contain("this.route('foo')");
      });
    });

    it('route foo/bar', function() {
      return emberGenerateDestroy(['route', 'foo/bar'], _file => {
        expect(_file('addon/routes/foo/bar.js')).to.equal(fixture('route/route-nested.js'));

        expect(_file('addon/templates/foo/bar.hbs')).to.equal('{{outlet}}');

        expect(_file('app/routes/foo/bar.js')).to.contain(
          "export { default } from 'my-addon/routes/foo/bar';"
        );

        expect(_file('app/templates/foo/bar.js')).to.contain(
          "export { default } from 'my-addon/templates/foo/bar';"
        );

        expect(_file('tests/unit/routes/foo/bar-test.js')).to.equal(
          fixture('route-test/default-nested.js')
        );

        expect(file('tests/dummy/app/router.js')).to.not.contain("this.route('bar')");
      }).then(() => {
        expect(file('tests/dummy/app/router.js')).to.not.contain("this.route('bar')");
      });
    });

    it('route foo --dummy', function() {
      return emberGenerateDestroy(['route', 'foo', '--dummy'], _file => {
        expect(_file('tests/dummy/app/routes/foo.js')).to.equal(fixture('route/route.js'));

        expect(_file('tests/dummy/app/templates/foo.hbs')).to.equal('{{outlet}}');

        expect(_file('app/routes/foo.js')).to.not.exist;
        expect(_file('app/templates/foo.hbs')).to.not.exist;
        expect(_file('tests/unit/routes/foo-test.js')).to.not.exist;

        expect(file('tests/dummy/app/router.js')).to.contain("this.route('foo')");
      }).then(() => {
        expect(file('tests/dummy/app/router.js')).to.not.contain("this.route('foo')");
      });
    });

    it('route foo/bar --dummy', function() {
      return emberGenerateDestroy(['route', 'foo/bar', '--dummy'], _file => {
        expect(_file('tests/dummy/app/routes/foo/bar.js')).to.equal(
          fixture('route/route-nested.js')
        );

        expect(_file('tests/dummy/app/templates/foo/bar.hbs')).to.equal('{{outlet}}');

        expect(_file('app/routes/foo/bar.js')).to.not.exist;
        expect(_file('app/templates/foo/bar.hbs')).to.not.exist;
        expect(_file('tests/unit/routes/foo/bar-test.js')).to.not.exist;

        expect(file('tests/dummy/app/router.js'))
          .to.contain("this.route('foo', function() {")
          .to.contain("this.route('bar')");
      }).then(() => {
        expect(file('tests/dummy/app/router.js')).to.not.contain("this.route('bar')");
      });
    });

    it('route foo --pod', function() {
      return emberGenerateDestroy(['route', 'foo', '--pod'], _file => {
        expect(_file('addon/foo/route.js')).to.equal(fixture('route/route.js'));

        expect(_file('addon/foo/template.hbs')).to.equal('{{outlet}}');

        expect(_file('app/foo/route.js')).to.contain(
          "export { default } from 'my-addon/foo/route';"
        );

        expect(_file('app/foo/template.js')).to.contain(
          "export { default } from 'my-addon/foo/template';"
        );

        expect(_file('tests/unit/foo/route-test.js')).to.equal(fixture('route-test/default.js'));
      });
    });
  });

  describe('in app - module unification', function() {
    beforeEach(function() {
      return emberNew()
        .then(() => {
          fs.ensureDirSync('src');
          fs.writeFileSync('src/router.js', fs.readFileSync('app/router.js'));
        })
        .then(() => generateFakePackageManifest('ember-cli-qunit', '4.1.0'));
    });

    it('route foo', function() {
      return emberGenerateDestroy(['route', 'foo'], _file => {
        expect(_file('src/ui/routes/foo/route.js')).to.equal(fixture('route/route.js'));

        expect(_file('src/ui/routes/foo/template.hbs')).to.equal('{{outlet}}');

        expect(_file('src/ui/routes/foo/route-test.js')).to.equal(fixture('route-test/default.js'));

        expect(file('src/router.js')).to.contain("this.route('foo')");
      }).then(() => {
        expect(file('src/router.js')).to.not.contain("this.route('foo')");
      });
    });

    it('route foo --skip-router', function() {
      return emberGenerateDestroy(['route', 'foo', '--skip-router'], _file => {
        expect(_file('src/ui/routes/foo/route.js')).to.exist;
        expect(_file('src/ui/routes/foo/template.hbs')).to.exist;
        expect(_file('src/ui/routes/foo/route-test.js')).to.exist;
        expect(file('src/router.js')).to.not.contain("this.route('foo')");
      }).then(() => {
        expect(file('src/router.js')).to.not.contain("this.route('foo')");
      });
    });

    it('route foo --path=:foo_id/show', function() {
      return emberGenerateDestroy(['route', 'foo', '--path=:foo_id/show'], _file => {
        expect(_file('src/ui/routes/foo/route.js')).to.equal(fixture('route/route.js'));

        expect(_file('src/ui/routes/foo/template.hbs')).to.equal('{{outlet}}');

        expect(_file('src/ui/routes/foo/route-test.js')).to.equal(fixture('route-test/default.js'));

        expect(file('src/router.js'))
          .to.contain("this.route('foo', {")
          .to.contain("path: ':foo_id/show'")
          .to.contain('});');
      }).then(() => {
        expect(file('src/router.js'))
          .to.not.contain("this.route('foo'")
          .to.not.contain("path: ':foo_id/show'");
      });
    });

    it('route parent/child --reset-namespace', function() {
      return emberGenerateDestroy(['route', 'parent/child', '--reset-namespace'], _file => {
        expect(_file('src/ui/routes/parent/child/route.js')).to.equal(
          fixture('route/route-child.js')
        );

        expect(_file('src/ui/routes/parent/child/template.hbs')).to.equal('{{outlet}}');

        expect(_file('src/ui/routes/parent/child/route-test.js')).to.equal(
          fixture('route-test/default-child.js')
        );

        expect(file('src/router.js'))
          .to.contain("this.route('parent', {")
          .to.contain("this.route('child', {")
          .to.contain('resetNamespace: true')
          .to.contain('});');
      });
    });

    it('route parent/child --reset-namespace --pod', function() {
      return expectError(
        emberGenerateDestroy(['route', 'parent/child', '--reset-namespace', '--pod']),
        "Pods aren't supported within a module unification app"
      );
    });

    it('route index', function() {
      return emberGenerateDestroy(['route', 'index'], _file => {
        expect(_file('src/ui/routes/index/route.js')).to.exist;
        expect(_file('src/ui/routes/index/template.hbs')).to.exist;
        expect(_file('src/ui/routes/index/route-test.js')).to.exist;
        expect(file('src/router.js')).to.not.contain("this.route('index')");
      }).then(() => {
        expect(file('src/router.js')).to.not.contain("this.route('index')");
      });
    });

    it('route application', function() {
      fs.removeSync('src/ui/routes/application/template.hbs');
      return emberGenerate(['route', 'application']).then(() => {
        expect(file('src/ui/routes/application/template.hbs')).to.exist;
        expect(file('src/router.js')).to.not.contain("this.route('application')");
      });
    });

    it('route basic', function() {
      return emberGenerateDestroy(['route', 'basic'], _file => {
        expect(_file('src/ui/routes/basic/route.js')).to.exist;
        expect(file('src/router.js')).to.not.contain("this.route('basic')");
      }).then(() => {
        expect(file('src/router.js')).to.not.contain("this.route('basic')");
      });
    });

    it('route foo --pod', function() {
      return expectError(
        emberGenerateDestroy(['route', 'foo', '--pod']),
        "Pods aren't supported within a module unification app"
      );
    });

    it('route foo --pod with --path', function() {
      return expectError(
        emberGenerateDestroy(['route', 'foo', '--pod', '--path=:foo_id/show']),
        "Pods aren't supported within a module unification app"
      );
    });

    it('route index --pod', function() {
      return expectError(
        emberGenerate(['route', 'index', '--pod']),
        "Pods aren't supported within a module unification app"
      );
    });

    it('route application --pod', function() {
      return expectError(
        emberGenerate(['route', 'application', '--pod']),
        "Pods aren't supported within a module unification app"
      );
    });

    it('route basic --pod', function() {
      return expectError(
        emberGenerate(['route', 'basic', '--pod']),
        "Pods aren't supported within a module unification app"
      );
    });

    describe('with podModulePrefix', function() {
      beforeEach(function() {
        setupPodConfig({ podModulePrefix: true });
      });

      it('route foo --pod', function() {
        return expectError(
          emberGenerateDestroy(['route', 'foo', '--pod']),
          "Pods aren't supported within a module unification app"
        );
      });
    });
  });

  describe('in addon - module unification', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' })
        .then(() => {
          fs.ensureDirSync('src');
          fs.ensureDirSync('tests/dummy/src');
          fs.writeFileSync(
            'tests/dummy/src/router.js',
            fs.readFileSync('tests/dummy/app/router.js')
          );
        })
        .then(() => generateFakePackageManifest('ember-cli-qunit', '4.1.0'));
    });

    it('route foo', function() {
      return emberGenerateDestroy(['route', 'foo'], _file => {
        expect(_file('src/ui/routes/foo/route.js')).to.equal(fixture('route/route.js'));

        expect(_file('src/ui/routes/foo/template.hbs')).to.equal('{{outlet}}');

        expect(_file('src/ui/routes/foo/route-test.js')).to.equal(fixture('route-test/default.js'));

        expect(file('tests/dummy/src/router.js')).to.not.contain("this.route('foo')");
      }).then(() => {
        expect(file('tests/dummy/src/router.js')).to.not.contain("this.route('foo')");
      });
    });

    it('route foo/bar', function() {
      return emberGenerateDestroy(['route', 'foo/bar'], _file => {
        expect(_file('src/ui/routes/foo/bar/route.js')).to.equal(fixture('route/route-nested.js'));

        expect(_file('src/ui/routes/foo/bar/template.hbs')).to.equal('{{outlet}}');

        expect(_file('src/ui/routes/foo/bar/route-test.js')).to.equal(
          fixture('route-test/default-nested.js')
        );

        expect(file('tests/dummy/src/router.js')).to.not.contain("this.route('bar')");
      }).then(() => {
        expect(file('tests/dummy/src/router.js')).to.not.contain("this.route('bar')");
      });
    });

    it('route foo --dummy', function() {
      return emberGenerateDestroy(['route', 'foo', '--dummy'], _file => {
        expect(_file('tests/dummy/src/ui/routes/foo/route.js')).to.equal(fixture('route/route.js'));

        expect(_file('tests/dummy/src/ui/routes/foo/template.hbs')).to.equal('{{outlet}}');

        expect(_file('src/ui/routes/foo/route.js')).to.not.exist;
        expect(_file('src/ui/routes/foo/template.hbs')).to.not.exist;
        expect(_file('src/ui/routes/foo/route-test.js')).to.not.exist;

        expect(file('tests/dummy/src/router.js')).to.contain("this.route('foo')");
      }).then(() => {
        expect(file('tests/dummy/src/router.js')).to.not.contain("this.route('foo')");
      });
    });

    it('route foo/bar --dummy', function() {
      return emberGenerateDestroy(['route', 'foo/bar', '--dummy'], _file => {
        expect(_file('tests/dummy/src/ui/routes/foo/bar/route.js')).to.equal(
          fixture('route/route-nested.js')
        );

        expect(_file('tests/dummy/src/ui/routes/foo/bar/template.hbs')).to.equal('{{outlet}}');

        expect(_file('src/ui/routes/foo/route.js')).to.not.exist;
        expect(_file('src/ui/routes/foo/template.hbs')).to.not.exist;
        expect(_file('src/ui/routes/foo/route-test.js')).to.not.exist;

        expect(file('tests/dummy/src/router.js'))
          .to.contain("this.route('foo', function() {")
          .to.contain("this.route('bar')");
      }).then(() => {
        expect(file('tests/dummy/src/router.js')).to.not.contain("this.route('bar')");
      });
    });

    it('route foo --pod', function() {
      return expectError(
        emberGenerateDestroy(['route', 'foo', '--pod']),
        "Pods aren't supported within a module unification app"
      );
    });
  });

  describe('in in-repo-addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'in-repo-addon' }).then(() =>
        generateFakePackageManifest('ember-cli-qunit', '4.1.0')
      );
    });

    it('route foo --in-repo-addon=my-addon', function() {
      return emberGenerateDestroy(['route', 'foo', '--in-repo-addon=my-addon'], _file => {
        expect(_file('lib/my-addon/addon/routes/foo.js')).to.equal(fixture('route/route.js'));

        expect(_file('lib/my-addon/addon/templates/foo.hbs')).to.equal('{{outlet}}');

        expect(_file('lib/my-addon/app/routes/foo.js')).to.contain(
          "export { default } from 'my-addon/routes/foo';"
        );

        expect(_file('lib/my-addon/app/templates/foo.js')).to.contain(
          "export { default } from 'my-addon/templates/foo';"
        );

        expect(_file('tests/unit/routes/foo-test.js')).to.equal(fixture('route-test/default.js'));
      });
    });

    it('route foo/bar --in-repo-addon=my-addon', function() {
      return emberGenerateDestroy(['route', 'foo/bar', '--in-repo-addon=my-addon'], _file => {
        expect(_file('lib/my-addon/addon/routes/foo/bar.js')).to.equal(
          fixture('route/route-nested.js')
        );

        expect(_file('lib/my-addon/addon/templates/foo/bar.hbs')).to.equal('{{outlet}}');

        expect(_file('lib/my-addon/app/routes/foo/bar.js')).to.contain(
          "export { default } from 'my-addon/routes/foo/bar';"
        );

        expect(_file('lib/my-addon/app/templates/foo/bar.js')).to.contain(
          "export { default } from 'my-addon/templates/foo/bar';"
        );

        expect(_file('tests/unit/routes/foo/bar-test.js')).to.equal(
          fixture('route-test/default-nested.js')
        );
      });
    });
  });
});
