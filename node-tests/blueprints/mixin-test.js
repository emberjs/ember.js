'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const setupPodConfig = blueprintHelpers.setupPodConfig;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

describe('Blueprint: mixin', function () {
  setupTestHooks(this);

  describe('in app', function () {
    beforeEach(function () {
      return emberNew();
    });

    it('mixin foo', function () {
      return emberGenerateDestroy(['mixin', 'foo'], (_file) => {
        expect(_file('app/mixins/foo.js'))
          .to.contain("import Mixin from '@ember/object/mixin';")
          .to.contain(`export default Mixin.create({});`);

        expect(_file('tests/unit/mixins/foo-test.js')).to.contain(
          "import FooMixin from 'my-app/mixins/foo';"
        );
      });
    });

    it('mixin foo.js', function () {
      return emberGenerateDestroy(['mixin', 'foo.js'], (_file) => {
        expect(_file('app/mixins/foo.js.js')).to.not.exist;
        expect(_file('tests/unit/mixins/foo.js-test.js')).to.not.exist;

        expect(_file('app/mixins/foo.js'))
          .to.contain("import Mixin from '@ember/object/mixin';")
          .to.contain(`export default Mixin.create({});`);

        expect(_file('tests/unit/mixins/foo-test.js')).to.contain(
          "import FooMixin from 'my-app/mixins/foo';"
        );
      });
    });

    it('mixin foo/bar', function () {
      return emberGenerateDestroy(['mixin', 'foo/bar'], (_file) => {
        expect(_file('app/mixins/foo/bar.js'))
          .to.contain("import Mixin from '@ember/object/mixin';")
          .to.contain(`export default Mixin.create({});`);

        expect(_file('tests/unit/mixins/foo/bar-test.js')).to.contain(
          "import FooBarMixin from 'my-app/mixins/foo/bar';"
        );
      });
    });

    it('mixin foo/bar/baz', function () {
      return emberGenerateDestroy(['mixin', 'foo/bar/baz'], (_file) => {
        expect(_file('tests/unit/mixins/foo/bar/baz-test.js')).to.contain(
          "import FooBarBazMixin from 'my-app/mixins/foo/bar/baz';"
        );
      });
    });

    it('mixin foo --pod', function () {
      return emberGenerateDestroy(['mixin', 'foo', '--pod'], (_file) => {
        expect(_file('app/mixins/foo.js'))
          .to.contain("import Mixin from '@ember/object/mixin';")
          .to.contain(`export default Mixin.create({});`);

        expect(_file('tests/unit/mixins/foo-test.js')).to.contain(
          "import FooMixin from 'my-app/mixins/foo';"
        );
      });
    });

    it('mixin foo.js --pod', function () {
      return emberGenerateDestroy(['mixin', 'foo.js', '--pod'], (_file) => {
        expect(_file('app/mixins/foo.js.js')).to.not.exist;
        expect(_file('tests/unit/mixins/foo.js-test.js')).to.not.exist;

        expect(_file('app/mixins/foo.js'))
          .to.contain("import Mixin from '@ember/object/mixin';")
          .to.contain(`export default Mixin.create({});`);

        expect(_file('tests/unit/mixins/foo-test.js')).to.contain(
          "import FooMixin from 'my-app/mixins/foo';"
        );
      });
    });

    it('mixin foo/bar --pod', function () {
      return emberGenerateDestroy(['mixin', 'foo/bar', '--pod'], (_file) => {
        expect(_file('app/mixins/foo/bar.js'))
          .to.contain("import Mixin from '@ember/object/mixin';")
          .to.contain(`export default Mixin.create({});`);

        expect(_file('tests/unit/mixins/foo/bar-test.js')).to.contain(
          "import FooBarMixin from 'my-app/mixins/foo/bar';"
        );
      });
    });

    it('mixin foo/bar/baz --pod', function () {
      return emberGenerateDestroy(['mixin', 'foo/bar/baz', '--pod'], (_file) => {
        expect(_file('tests/unit/mixins/foo/bar/baz-test.js')).to.contain(
          "import FooBarBazMixin from 'my-app/mixins/foo/bar/baz';"
        );
      });
    });

    describe('with podModulePrefix', function () {
      beforeEach(function () {
        setupPodConfig({ podModulePrefix: true });
      });

      it('mixin foo --pod', function () {
        return emberGenerateDestroy(['mixin', 'foo', '--pod'], (_file) => {
          expect(_file('app/mixins/foo.js'))
            .to.contain("import Mixin from '@ember/object/mixin';")
            .to.contain(`export default Mixin.create({});`);

          expect(_file('tests/unit/mixins/foo-test.js')).to.contain(
            "import FooMixin from 'my-app/mixins/foo';"
          );
        });
      });

      it('mixin foo.js --pod', function () {
        return emberGenerateDestroy(['mixin', 'foo.js', '--pod'], (_file) => {
          expect(_file('app/mixins/foo.js.js')).to.not.exist;
          expect(_file('tests/unit/mixins/foo.js-test.js')).to.not.exist;

          expect(_file('app/mixins/foo.js'))
            .to.contain("import Mixin from '@ember/object/mixin';")
            .to.contain(`export default Mixin.create({});`);

          expect(_file('tests/unit/mixins/foo-test.js')).to.contain(
            "import FooMixin from 'my-app/mixins/foo';"
          );
        });
      });

      it('mixin foo/bar --pod', function () {
        return emberGenerateDestroy(['mixin', 'foo/bar', '--pod'], (_file) => {
          expect(_file('app/mixins/foo/bar.js'))
            .to.contain("import Mixin from '@ember/object/mixin';")
            .to.contain(`export default Mixin.create({});`);

          expect(_file('tests/unit/mixins/foo/bar-test.js')).to.contain(
            "import FooBarMixin from 'my-app/mixins/foo/bar';"
          );
        });
      });
    });
  });

  describe('in addon', function () {
    beforeEach(function () {
      return emberNew({ target: 'addon' });
    });

    it('mixin foo', function () {
      return emberGenerateDestroy(['mixin', 'foo'], (_file) => {
        expect(_file('addon/mixins/foo.js'))
          .to.contain("import Mixin from '@ember/object/mixin';")
          .to.contain(`export default Mixin.create({});`);

        expect(_file('tests/unit/mixins/foo-test.js')).to.contain(
          "import FooMixin from 'my-addon/mixins/foo';"
        );

        expect(_file('app/mixins/foo.js')).to.not.exist;
      });
    });

    it('mixin foo.js', function () {
      return emberGenerateDestroy(['mixin', 'foo.js'], (_file) => {
        expect(_file('addon/mixins/foo.js.js')).to.not.exist;
        expect(_file('tests/unit/mixins/foo.js-test.js')).to.not.exist;

        expect(_file('addon/mixins/foo.js'))
          .to.contain("import Mixin from '@ember/object/mixin';")
          .to.contain(`export default Mixin.create({});`);

        expect(_file('tests/unit/mixins/foo-test.js')).to.contain(
          "import FooMixin from 'my-addon/mixins/foo';"
        );

        expect(_file('app/mixins/foo.js')).to.not.exist;
      });
    });

    it('mixin foo/bar', function () {
      return emberGenerateDestroy(['mixin', 'foo/bar'], (_file) => {
        expect(_file('addon/mixins/foo/bar.js'))
          .to.contain("import Mixin from '@ember/object/mixin';")
          .to.contain(`export default Mixin.create({});`);

        expect(_file('tests/unit/mixins/foo/bar-test.js')).to.contain(
          "import FooBarMixin from 'my-addon/mixins/foo/bar';"
        );

        expect(_file('app/mixins/foo/bar.js')).to.not.exist;
      });
    });

    it('mixin foo/bar/baz', function () {
      return emberGenerateDestroy(['mixin', 'foo/bar/baz'], (_file) => {
        expect(_file('addon/mixins/foo/bar/baz.js'))
          .to.contain("import Mixin from '@ember/object/mixin';")
          .to.contain(`export default Mixin.create({});`);

        expect(_file('tests/unit/mixins/foo/bar/baz-test.js')).to.contain(
          "import FooBarBazMixin from 'my-addon/mixins/foo/bar/baz';"
        );

        expect(_file('app/mixins/foo/bar/baz.js')).to.not.exist;
      });
    });

    it('mixin foo/bar/baz --dummy', function () {
      return emberGenerateDestroy(['mixin', 'foo/bar/baz', '--dummy'], (_file) => {
        expect(_file('tests/dummy/app/mixins/foo/bar/baz.js'))
          .to.contain("import Mixin from '@ember/object/mixin';")
          .to.contain(`export default Mixin.create({});`);

        expect(_file('addon/mixins/foo/bar/baz.js')).to.not.exist;
      });
    });

    it('mixin foo.js --dummy', function () {
      return emberGenerateDestroy(['mixin', 'foo.js', '--dummy'], (_file) => {
        expect(_file('tests/dummy/app/mixins/foo.js.js')).to.not.exist;

        expect(_file('tests/dummy/app/mixins/foo.js'))
          .to.contain("import Mixin from '@ember/object/mixin';")
          .to.contain(`export default Mixin.create({});`);

        expect(_file('addon/mixins/foo.js')).to.not.exist;
      });
    });
  });

  describe('in in-repo-addon', function () {
    beforeEach(function () {
      return emberNew({ target: 'in-repo-addon' });
    });

    it('mixin foo --in-repo-addon=my-addon', function () {
      return emberGenerateDestroy(['mixin', 'foo', '--in-repo-addon=my-addon'], (_file) => {
        expect(_file('lib/my-addon/addon/mixins/foo.js'))
          .to.contain("import Mixin from '@ember/object/mixin';")
          .to.contain(`export default Mixin.create({});`);

        expect(_file('tests/unit/mixins/foo-test.js')).to.contain(
          "import FooMixin from 'my-addon/mixins/foo';"
        );
      });
    });

    it('mixin foo.js --in-repo-addon=my-addon', function () {
      return emberGenerateDestroy(['mixin', 'foo.js', '--in-repo-addon=my-addon'], (_file) => {
        expect(_file('lib/my-addon/addon/mixins/foo.js.js')).to.not.exist;
        expect(_file('tests/unit/mixins/foo.js-test.js')).to.not.exist;

        expect(_file('lib/my-addon/addon/mixins/foo.js'))
          .to.contain("import Mixin from '@ember/object/mixin';")
          .to.contain(`export default Mixin.create({});`);

        expect(_file('tests/unit/mixins/foo-test.js')).to.contain(
          "import FooMixin from 'my-addon/mixins/foo';"
        );
      });
    });

    it('mixin foo/bar --in-repo-addon=my-addon', function () {
      return emberGenerateDestroy(['mixin', 'foo/bar', '--in-repo-addon=my-addon'], (_file) => {
        expect(_file('lib/my-addon/addon/mixins/foo/bar.js'))
          .to.contain("import Mixin from '@ember/object/mixin';")
          .to.contain(`export default Mixin.create({});`);

        expect(_file('tests/unit/mixins/foo/bar-test.js')).to.contain(
          "import FooBarMixin from 'my-addon/mixins/foo/bar';"
        );
      });
    });

    it('mixin foo/bar/baz --in-repo-addon=my-addon', function () {
      return emberGenerateDestroy(['mixin', 'foo/bar/baz', '--in-repo-addon=my-addon'], (_file) => {
        expect(_file('tests/unit/mixins/foo/bar/baz-test.js')).to.contain(
          "import FooBarBazMixin from 'my-addon/mixins/foo/bar/baz';"
        );
      });
    });
  });
});
