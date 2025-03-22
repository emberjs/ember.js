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
        expect(_file('tests/integration/components/foo-test.js')).to.equal(
          fixture('component-test/app.js', {
            replace: {
              component: 'foo',
              componentInvocation: 'Foo',
            },
          })
        );
      });
    });

    it('component-test x-foo --unit', function () {
      return emberGenerateDestroy(['component-test', 'x-foo', '--unit'], (_file) => {
        expect(_file('tests/unit/components/x-foo-test.js')).to.equal(
          fixture('component-test/unit.js')
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
        expect(_file('tests/integration/components/foo-test.js')).to.equal(
          fixture('component-test/addon.js', {
            replace: {
              component: 'foo',
              componentInvocation: 'Foo',
            },
          })
        );
      });
    });

    it('component-test foo --unit', function () {
      return emberGenerateDestroy(['component-test', 'foo', '--unit'], (_file) => {
        expect(_file('tests/unit/components/foo-test.js')).to.equal(
          fixture('component-test/addon-unit.js')
        );
      });
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
          expect(_file('tests/integration/components/foo-test.js')).to.equal(
            fixture('component-test/app.js', {
              replace: {
                component: 'foo',
                componentInvocation: 'Foo',
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
          expect(_file('tests/unit/components/x-foo-test.js')).to.equal(
            fixture('component-test/unit.js')
          );
        }
      );
    });
  });
});
