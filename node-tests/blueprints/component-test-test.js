'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

const fixture = require('../helpers/fixture');

describe('Blueprint: component-test', function () {
  setupTestHooks(this);

  describe('in app', function () {
    beforeEach(function () {
      return emberNew();
    });

    it('component-test foo', function () {
      return emberGenerateDestroy(['component-test', 'foo'], (_file) => {
        expect(_file('tests/integration/components/foo-test.gjs')).to.equal(
          fixture('component-test/app.gjs', {
            replace: {
              component: 'foo',
              componentInvocation: 'Foo',
              testDescription: 'Integration | Component | foo',
            },
          })
        );
      });
    });

    it('component-test foo --strict', function () {
      return emberGenerateDestroy(['component-test', 'foo', '--strict'], (_file) => {
        expect(_file('tests/integration/components/foo-test.gjs')).to.equal(
          fixture('component-test/app.gjs', {
            replace: {
              component: 'foo',
              componentInvocation: 'Foo',
              testDescription: 'Integration | Component | foo',
            },
          })
        );
      });
    });

    it('component-test foo --strict --typescript', function () {
      return emberGenerateDestroy(
        ['component-test', 'foo', '--strict', '--typescript'],
        (_file) => {
          expect(_file('tests/integration/components/foo-test.gts')).to.equal(
            fixture('component-test/app.gts')
          );
        }
      );
    });

    it('component-test x-foo --unit', function () {
      return emberGenerateDestroy(['component-test', 'x-foo', '--unit'], (_file) => {
        expect(_file('tests/unit/components/x-foo-test.gjs')).to.equal(
          fixture('component-test/app.gjs', {
            replace: {
              component: 'x-foo',
              componentInvocation: 'XFoo',
              testDescription: 'Unit | Component | x-foo',
            },
          })
        );
      });
    });
  });

  describe('in addon', function () {
    beforeEach(function () {
      return emberNew({ target: 'addon' });
    });

    it('component-test foo', function () {
      return emberGenerateDestroy(['component-test', 'foo'], (_file) => {
        expect(_file('tests/integration/components/foo-test.gjs')).to.equal(
          fixture('component-test/addon.gjs', {
            replace: {
              component: 'foo',
              componentInvocation: 'Foo',
              testDescription: 'Integration | Component | foo',
            },
          })
        );
      });
    });

    it('component-test foo --unit', function () {
      return emberGenerateDestroy(['component-test', 'foo', '--unit'], (_file) => {
        expect(_file('tests/unit/components/foo-test.gjs')).to.equal(
          fixture('component-test/addon.gjs', {
            replace: {
              component: 'foo',
              componentInvocation: 'Foo',
              testDescription: 'Unit | Component | foo',
            },
          })
        );
      });
    });

    it('component-test foo --strict', function () {
      return emberGenerateDestroy(['component-test', 'foo', '--strict'], (_file) => {
        expect(_file('tests/integration/components/foo-test.gjs')).to.equal(
          fixture('component-test/addon.gjs', {
            replace: {
              component: 'foo',
              componentInvocation: 'Foo',
              testDescription: 'Integration | Component | foo',
            },
          })
        );
      });
    });

    it('component-test foo --strict --typescript', function () {
      return emberGenerateDestroy(
        ['component-test', 'foo', '--strict', '--typescript'],
        (_file) => {
          expect(_file('tests/integration/components/foo-test.gts')).to.equal(
            fixture('component-test/addon.gts')
          );
        }
      );
    });
  });

  describe('in in-repo-addon', function () {
    beforeEach(function () {
      return emberNew({ target: 'in-repo-addon' });
    });

    it('component-test foo --in-repo-addon=my-addon', function () {
      return emberGenerateDestroy(
        ['component-test', 'foo', '--in-repo-addon=my-addon'],
        (_file) => {
          expect(_file('tests/integration/components/foo-test.gjs')).to.equal(
            fixture('component-test/app.gjs', {
              replace: {
                component: 'foo',
                componentInvocation: 'Foo',
                testDescription: 'Integration | Component | foo',
              },
            })
          );
        }
      );
    });

    it('component-test x-foo --in-repo-addon=my-addon --unit', function () {
      return emberGenerateDestroy(
        ['component-test', 'x-foo', '--in-repo-addon=my-addon', '--unit'],
        (_file) => {
          expect(_file('tests/unit/components/x-foo-test.gjs')).to.equal(
            fixture('component-test/app.gjs', {
              replace: {
                component: 'x-foo',
                componentInvocation: 'XFoo',
                testDescription: 'Unit | Component | x-foo',
              },
            })
          );
        }
      );
    });
  });
});
