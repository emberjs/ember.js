'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const setupPodConfig = blueprintHelpers.setupPodConfig;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

const fixture = require('../helpers/fixture');

describe('Blueprint: helper', function() {
  setupTestHooks(this);

  describe('in app', function() {
    beforeEach(function() {
      return emberNew();
    });

    it('helper foo/bar-baz', function() {
      return emberGenerateDestroy(['helper', 'foo/bar-baz'], _file => {
        expect(_file('app/helpers/foo/bar-baz.js')).to.equal(fixture('helper.js'));
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js')).to.equal(
          fixture('helper-test/rfc232.js')
        );
      });
    });

    it('helper foo/bar-baz unit', function() {
      return emberGenerateDestroy(['helper', '--test-type=unit', 'foo/bar-baz'], _file => {
        expect(_file('app/helpers/foo/bar-baz.js')).to.equal(fixture('helper.js'));
        expect(_file('tests/unit/helpers/foo/bar-baz-test.js')).to.equal(
          fixture('helper-test/rfc232-unit.js')
        );
      });
    });

    it('helper foo/bar-baz --pod', function() {
      return emberGenerateDestroy(['helper', 'foo/bar-baz', '--pod'], _file => {
        expect(_file('app/helpers/foo/bar-baz.js')).to.equal(fixture('helper.js'));
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js')).to.equal(
          fixture('helper-test/rfc232.js')
        );
      });
    });

    it('helper foo/bar-baz --pod', function() {
      return emberGenerateDestroy(['helper', 'foo/bar-baz', '--pod'], _file => {
        expect(_file('app/helpers/foo/bar-baz.js')).to.equal(fixture('helper.js'));
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js')).to.equal(
          fixture('helper-test/rfc232.js')
        );
      });
    });

    describe('with podModulePrefix', function() {
      beforeEach(function() {
        setupPodConfig({ podModulePrefix: true });
      });

      it('helper foo/bar-baz --pod', function() {
        return emberGenerateDestroy(['helper', 'foo/bar-baz', '--pod'], _file => {
          expect(_file('app/helpers/foo/bar-baz.js')).to.equal(fixture('helper.js'));
          expect(_file('tests/integration/helpers/foo/bar-baz-test.js')).to.equal(
            fixture('helper-test/rfc232.js')
          );
        });
      });

      it('helper foo/bar-baz --pod', function() {
        return emberGenerateDestroy(['helper', 'foo/bar-baz', '--pod'], _file => {
          expect(_file('app/helpers/foo/bar-baz.js')).to.equal(fixture('helper.js'));
          expect(_file('tests/integration/helpers/foo/bar-baz-test.js')).to.equal(
            fixture('helper-test/rfc232.js')
          );
        });
      });
    });
  });

  describe('in app - module unification', function() {
    beforeEach(function() {
      return emberNew({ isModuleUnification: true });
    });

    it('helper foo/bar-baz', function() {
      return emberGenerateDestroy(
        ['helper', 'foo/bar-baz'],
        _file => {
          expect(_file('src/ui/components/foo/bar-baz.js')).to.equal(fixture('helper.js'));
          expect(_file('src/ui/components/foo/bar-baz-test.js')).to.equal(
            fixture('helper-test/rfc232.js')
          );
        },
        { isModuleUnification: true }
      );
    });

    it('helper foo/bar-baz unit', function() {
      return emberGenerateDestroy(
        ['helper', '--test-type=unit', 'foo/bar-baz'],
        _file => {
          expect(_file('src/ui/components/foo/bar-baz.js')).to.equal(fixture('helper.js'));
          expect(_file('src/ui/components/foo/bar-baz-test.js')).to.equal(
            fixture('helper-test/rfc232-unit.js')
          );
        },
        { isModuleUnification: true }
      );
    });
  });

  describe('in addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' });
    });

    it('helper foo/bar-baz', function() {
      return emberGenerateDestroy(['helper', 'foo/bar-baz'], _file => {
        expect(_file('addon/helpers/foo/bar-baz.js')).to.equal(fixture('helper.js'));
        expect(_file('app/helpers/foo/bar-baz.js')).to.equal(fixture('helper-addon.js'));
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js')).to.equal(
          fixture('helper-test/rfc232.js')
        );
      });
    });

    it('helper foo/bar-baz --dummy', function() {
      return emberGenerateDestroy(['helper', 'foo/bar-baz', '--dummy'], _file => {
        expect(_file('tests/dummy/app/helpers/foo/bar-baz.js')).to.equal(fixture('helper.js'));
        expect(_file('app/helpers/foo/bar-baz.js')).to.not.exist;
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js')).to.not.exist;
      });
    });
  });

  describe('in addon - module unification', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon', isModuleUnification: true });
    });

    it('helper foo/bar-baz', function() {
      return emberGenerateDestroy(
        ['helper', 'foo/bar-baz'],
        _file => {
          expect(_file('src/ui/components/foo/bar-baz.js')).to.equal(fixture('helper.js'));
          expect(_file('src/ui/components/foo/bar-baz-test.js')).to.equal(
            fixture('helper-test/rfc232.js')
          );
        },
        { isModuleUnification: true }
      );
    });

    it('helper foo/bar-baz unit', function() {
      return emberGenerateDestroy(
        ['helper', '--test-type=unit', 'foo/bar-baz'],
        _file => {
          expect(_file('src/ui/components/foo/bar-baz.js')).to.equal(fixture('helper.js'));
          expect(_file('src/ui/components/foo/bar-baz-test.js')).to.equal(
            fixture('helper-test/module-unification/addon-rfc232-unit.js')
          );
        },
        { isModuleUnification: true }
      );
    });
  });

  describe('in in-repo-addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'in-repo-addon' });
    });

    it('helper foo/bar-baz --in-repo-addon=my-addon', function() {
      return emberGenerateDestroy(['helper', 'foo/bar-baz', '--in-repo-addon=my-addon'], _file => {
        expect(_file('lib/my-addon/addon/helpers/foo/bar-baz.js')).to.equal(fixture('helper.js'));
        expect(_file('lib/my-addon/app/helpers/foo/bar-baz.js')).to.equal(
          fixture('helper-addon.js')
        );
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js')).to.equal(
          fixture('helper-test/rfc232.js')
        );
      });
    });
  });

  describe('in in-repo-addon - module unification', function() {
    beforeEach(function() {
      return emberNew({ target: 'in-repo-addon', isModuleUnification: true });
    });

    it('helper foo/bar-baz --in-repo-addon=my-addon', function() {
      return emberGenerateDestroy(
        ['helper', 'foo/bar-baz', '--in-repo-addon=my-addon'],
        _file => {
          expect(_file('packages/my-addon/src/ui/components/foo/bar-baz.js')).to.equal(
            fixture('helper.js')
          );
          expect(_file('packages/my-addon/src/ui/components/foo/bar-baz-test.js')).to.equal(
            fixture('helper-test/rfc232.js')
          );
        },
        { isModuleUnification: true }
      );
    });

    it('helper foo/bar-baz unit --in-repo-addon=my-addon', function() {
      return emberGenerateDestroy(
        ['helper', '--test-type=unit', 'foo/bar-baz', '--in-repo-addon=my-addon'],
        _file => {
          expect(_file('packages/my-addon/src/ui/components/foo/bar-baz.js')).to.equal(
            fixture('helper.js')
          );
          expect(_file('packages/my-addon/src/ui/components/foo/bar-baz-test.js')).to.equal(
            fixture('helper-test/module-unification/addon-rfc232-unit.js')
          );
        },
        { isModuleUnification: true }
      );
    });
  });
});
