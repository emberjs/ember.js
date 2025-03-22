'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const setupPodConfig = blueprintHelpers.setupPodConfig;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

const fixture = require('../helpers/fixture');

describe('Blueprint: util', function () {
  setupTestHooks(this);

  describe('in app', function () {
    beforeEach(function () {
      return emberNew();
    });

    it('util foo-bar', function () {
      return emberGenerateDestroy(['util', 'foo-bar'], (_file) => {
        expect(_file('app/utils/foo-bar.js')).to.equal(fixture('util/util.js'));

        expect(_file('tests/unit/utils/foo-bar-test.js')).to.equal(fixture('util-test/app.js'));
      });
    });

    it('util foo-bar.js', function () {
      return emberGenerateDestroy(['util', 'foo-bar.js'], (_file) => {
        expect(_file('app/utils/foo-bar.js.js')).to.not.exist;
        expect(_file('tests/unit/utils/foo-bar.js-test.js')).to.not.exist;

        expect(_file('app/utils/foo-bar.js')).to.equal(fixture('util/util.js'));

        expect(_file('tests/unit/utils/foo-bar-test.js')).to.equal(fixture('util-test/app.js'));
      });
    });

    it('util foo/bar-baz', function () {
      return emberGenerateDestroy(['util', 'foo/bar-baz'], (_file) => {
        expect(_file('app/utils/foo/bar-baz.js')).to.equal(fixture('util/util-nested.js'));

        expect(_file('tests/unit/utils/foo/bar-baz-test.js')).to.equal(
          fixture('util-test/nested.js')
        );
      });
    });

    it('util foo-bar --pod', function () {
      return emberGenerateDestroy(['util', 'foo-bar', '--pod'], (_file) => {
        expect(_file('app/utils/foo-bar.js')).to.equal(fixture('util/util.js'));

        expect(_file('tests/unit/utils/foo-bar-test.js')).to.equal(fixture('util-test/app.js'));
      });
    });

    it('util foo-bar.js --pod', function () {
      return emberGenerateDestroy(['util', 'foo-bar.js', '--pod'], (_file) => {
        expect(_file('app/utils/foo-bar.js.js')).to.not.exist;
        expect(_file('tests/unit/utils/foo-bar.js-test.js')).to.not.exist;

        expect(_file('app/utils/foo-bar.js')).to.equal(fixture('util/util.js'));

        expect(_file('tests/unit/utils/foo-bar-test.js')).to.equal(fixture('util-test/app.js'));
      });
    });

    it('util foo/bar-baz --pod', function () {
      return emberGenerateDestroy(['util', 'foo/bar-baz', '--pod'], (_file) => {
        expect(_file('app/utils/foo/bar-baz.js')).to.equal(fixture('util/util-nested.js'));

        expect(_file('tests/unit/utils/foo/bar-baz-test.js')).to.equal(
          fixture('util-test/nested.js')
        );
      });
    });

    describe('with podModulePrefix', function () {
      beforeEach(function () {
        return setupPodConfig({ podModulePrefix: true });
      });

      it('util foo-bar --pod', function () {
        return emberGenerateDestroy(['util', 'foo-bar', '--pod'], (_file) => {
          expect(_file('app/utils/foo-bar.js')).to.equal(fixture('util/util.js'));

          expect(_file('tests/unit/utils/foo-bar-test.js')).to.equal(fixture('util-test/app.js'));
        });
      });

      it('util foo-bar.js --pod', function () {
        return emberGenerateDestroy(['util', 'foo-bar.js', '--pod'], (_file) => {
          expect(_file('app/utils/foo-bar.js.js')).to.not.exist;
          expect(_file('tests/unit/utils/foo-bar.js-test.js')).to.not.exist;

          expect(_file('app/utils/foo-bar.js')).to.equal(fixture('util/util.js'));

          expect(_file('tests/unit/utils/foo-bar-test.js')).to.equal(fixture('util-test/app.js'));
        });
      });
    });
  });

  describe('in addon', function () {
    beforeEach(function () {
      return emberNew({ target: 'addon' });
    });

    it('util foo-bar', function () {
      return emberGenerateDestroy(['util', 'foo-bar'], (_file) => {
        expect(_file('addon/utils/foo-bar.js')).to.equal(fixture('util/util.js'));

        expect(_file('app/utils/foo-bar.js')).to.contain(
          "export { default } from 'my-addon/utils/foo-bar';"
        );

        expect(_file('tests/unit/utils/foo-bar-test.js')).to.equal(fixture('util-test/addon.js'));
      });
    });

    it('util foo-bar.js', function () {
      return emberGenerateDestroy(['util', 'foo-bar.js'], (_file) => {
        expect(_file('addon/utils/foo-bar.js.js')).to.not.exist;
        expect(_file('app/utils/foo-bar.js.js')).to.not.exist;
        expect(_file('tests/unit/utils/foo-bar.js-test.js')).to.not.exist;

        expect(_file('addon/utils/foo-bar.js')).to.equal(fixture('util/util.js'));

        expect(_file('app/utils/foo-bar.js')).to.contain(
          "export { default } from 'my-addon/utils/foo-bar';"
        );

        expect(_file('tests/unit/utils/foo-bar-test.js')).to.equal(fixture('util-test/addon.js'));
      });
    });

    it('util foo/bar-baz', function () {
      return emberGenerateDestroy(['util', 'foo/bar-baz'], (_file) => {
        expect(_file('addon/utils/foo/bar-baz.js')).to.equal(fixture('util/util-nested.js'));

        expect(_file('app/utils/foo/bar-baz.js')).to.contain(
          "export { default } from 'my-addon/utils/foo/bar-baz';"
        );

        expect(_file('tests/unit/utils/foo/bar-baz-test.js')).to.equal(
          fixture('util-test/addon-nested.js')
        );
      });
    });

    it('util foo/bar-baz --dummy', function () {
      return emberGenerateDestroy(['util', 'foo/bar-baz', '--dummy'], (_file) => {
        expect(_file('tests/dummy/app/utils/foo/bar-baz.js')).to.equal(
          fixture('util/util-nested.js')
        );

        expect(_file('addon/utils/foo/bar-baz.js')).to.not.exist;
      });
    });
  });

  describe('in in-repo-addon', function () {
    beforeEach(function () {
      return emberNew({ target: 'in-repo-addon' });
    });

    it('util foo-bar --in-repo-addon=my-addon', function () {
      return emberGenerateDestroy(['util', 'foo-bar', '--in-repo-addon=my-addon'], (_file) => {
        expect(_file('lib/my-addon/addon/utils/foo-bar.js')).to.equal(fixture('util/util.js'));

        expect(_file('lib/my-addon/app/utils/foo-bar.js')).to.contain(
          "export { default } from 'my-addon/utils/foo-bar';"
        );

        expect(_file('tests/unit/utils/foo-bar-test.js')).to.equal(fixture('util-test/app.js'));
      });
    });

    it('util foo-bar.js --in-repo-addon=my-addon', function () {
      return emberGenerateDestroy(['util', 'foo-bar.js', '--in-repo-addon=my-addon'], (_file) => {
        expect(_file('lib/my-addon/addon/utils/foo-bar.js.js')).to.not.exist;
        expect(_file('lib/my-addon/app/utils/foo-bar.js.js')).to.not.exist;
        expect(_file('tests/unit/utils/foo-bar.js-test.js')).to.not.exist;

        expect(_file('lib/my-addon/addon/utils/foo-bar.js')).to.equal(fixture('util/util.js'));

        expect(_file('lib/my-addon/app/utils/foo-bar.js')).to.contain(
          "export { default } from 'my-addon/utils/foo-bar';"
        );

        expect(_file('tests/unit/utils/foo-bar-test.js')).to.equal(fixture('util-test/app.js'));
      });
    });

    it('util foo/bar-baz --in-repo-addon=my-addon', function () {
      return emberGenerateDestroy(['util', 'foo/bar-baz', '--in-repo-addon=my-addon'], (_file) => {
        expect(_file('lib/my-addon/addon/utils/foo/bar-baz.js')).to.equal(
          fixture('util/util-nested.js')
        );

        expect(_file('lib/my-addon/app/utils/foo/bar-baz.js')).to.contain(
          "export { default } from 'my-addon/utils/foo/bar-baz';"
        );

        expect(_file('tests/unit/utils/foo/bar-baz-test.js')).to.equal(
          fixture('util-test/nested.js')
        );
      });
    });
  });
});
