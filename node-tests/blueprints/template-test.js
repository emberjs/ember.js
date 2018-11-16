'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const emberGenerate = blueprintHelpers.emberGenerate;
const setupPodConfig = blueprintHelpers.setupPodConfig;
const expectError = require('../helpers/expect-error');

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

describe('Blueprint: template', function() {
  setupTestHooks(this);

  describe('in app', function() {
    beforeEach(function() {
      return emberNew();
    });

    it('template foo', function() {
      return emberGenerateDestroy(['template', 'foo'], _file => {
        expect(_file('app/templates/foo.hbs')).to.equal('');
      });
    });

    it('template foo/bar', function() {
      return emberGenerateDestroy(['template', 'foo/bar'], _file => {
        expect(_file('app/templates/foo/bar.hbs')).to.equal('');
      });
    });

    describe('with usePods', function() {
      beforeEach(function() {
        setupPodConfig({ usePods: true });
      });

      it('template foo', function() {
        return emberGenerateDestroy(['template', 'foo'], _file => {
          expect(_file('app/foo/template.hbs')).to.equal('');
        });
      });

      it('template foo/bar', function() {
        return emberGenerateDestroy(['template', 'foo/bar'], _file => {
          expect(_file('app/foo/bar/template.hbs')).to.equal('');
        });
      });
    });

    describe('with usePods + podModulePrefix', function() {
      beforeEach(function() {
        setupPodConfig({
          usePods: true,
          podModulePrefix: true,
        });
      });

      it('template foo', function() {
        return emberGenerateDestroy(['template', 'foo'], _file => {
          expect(_file('app/pods/foo/template.hbs')).to.equal('');
        });
      });

      it('template foo/bar', function() {
        return emberGenerateDestroy(['template', 'foo/bar'], _file => {
          expect(_file('app/pods/foo/bar/template.hbs')).to.equal('');
        });
      });
    });
  });

  describe('in addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' });
    });

    it('template foo', function() {
      return emberGenerateDestroy(['template', 'foo'], _file => {
        expect(_file('addon/templates/foo.hbs')).to.equal('');
      });
    });

    it('template foo/bar', function() {
      return emberGenerateDestroy(['template', 'foo/bar'], _file => {
        expect(_file('addon/templates/foo/bar.hbs')).to.equal('');
      });
    });

    it('template foo --dummy', function() {
      return emberGenerateDestroy(['template', 'foo', '--dummy'], _file => {
        expect(_file('tests/dummy/app/templates/foo.hbs')).to.equal('');
      });
    });

    it('template foo/bar --dummy', function() {
      return emberGenerateDestroy(['template', 'foo/bar', '--dummy'], _file => {
        expect(_file('tests/dummy/app/templates/foo/bar.hbs')).to.equal('');
      });
    });
  });

  describe('in in-repo-addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'in-repo-addon' });
    });

    it('template foo --in-repo-addon=my-addon', function() {
      return emberGenerateDestroy(['template', 'foo', '--in-repo-addon=my-addon'], _file => {
        expect(_file('lib/my-addon/addon/templates/foo.hbs')).to.equal('');
      });
    });

    it('template foo/bar --in-repo-addon=my-addon', function() {
      return emberGenerateDestroy(['template', 'foo/bar', '--in-repo-addon=my-addon'], _file => {
        expect(_file('lib/my-addon/addon/templates/foo/bar.hbs')).to.equal('');
      });
    });
  });

  describe('in app - module unification', function() {
    beforeEach(function() {
      return emberNew({ isModuleUnification: true });
    });

    it('template foo', function() {
      return emberGenerateDestroy(
        ['template', 'foo'],
        _file => {
          expect(_file('src/ui/routes/foo/template.hbs')).to.equal('');
        },
        { isModuleUnification: true }
      );
    });

    it('template foo/bar', function() {
      return emberGenerateDestroy(
        ['template', 'foo/bar'],
        _file => {
          expect(_file('src/ui/routes/foo/bar/template.hbs')).to.equal('');
        },
        { isModuleUnification: true }
      );
    });
  });

  describe('with usePods - module unification', function() {
    beforeEach(function() {
      return emberNew({ isModuleUnification: true });
    });

    it('shows an error', function() {
      return expectError(
        emberGenerate(['template', 'foo', '--pod'], { isModuleUnification: true }),
        "Pods aren't supported within a module unification app"
      );
    });
  });

  describe('in addon - module unification', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon', isModuleUnification: true });
    });

    it('template foo', function() {
      return emberGenerateDestroy(
        ['template', 'foo'],
        _file => {
          expect(_file('src/ui/routes/foo/template.hbs')).to.equal('');
        },
        { isModuleUnification: true }
      );
    });

    it('template foo/bar', function() {
      return emberGenerateDestroy(
        ['template', 'foo/bar'],
        _file => {
          expect(_file('src/ui/routes/foo/bar/template.hbs')).to.equal('');
        },
        { isModuleUnification: true }
      );
    });

    it('template foo --dummy', function() {
      return emberGenerate(
        ['template', 'foo', '--dummy'],
        _file => {
          expect(_file('tests/dummy/src/ui/routes/foo/template.hbs')).to.equal('');
        },
        { isModuleUnification: true }
      );
    });

    it('template foo/bar --dummy', function() {
      return emberGenerate(
        ['template', 'foo/bar', '--dummy'],
        _file => {
          expect(_file('tests/dummy/src/ui/routes/foo/bar/template.hbs')).to.equal('');
        },
        { isModuleUnification: true }
      );
    });
  });
});
