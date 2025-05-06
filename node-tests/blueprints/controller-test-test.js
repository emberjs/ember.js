'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

const fixture = require('../helpers/fixture');

describe('Blueprint: controller-test', function () {
  setupTestHooks(this);

  describe('in app', function () {
    beforeEach(function () {
      return emberNew();
    });

    it('controller-test foo', function () {
      return emberGenerateDestroy(['controller-test', 'foo'], (_file) => {
        expect(_file('tests/unit/controllers/foo-test.js')).to.equal(
          fixture('controller-test/app.js')
        );
      });
    });

    it('controller-test foo/bar', function () {
      return emberGenerateDestroy(['controller-test', 'foo/bar'], (_file) => {
        expect(_file('tests/unit/controllers/foo/bar-test.js')).to.equal(
          fixture('controller-test/nested.js')
        );
      });
    });
  });

  describe('in addon', function () {
    beforeEach(function () {
      return emberNew({ target: 'addon' });
    });

    it('controller-test foo', function () {
      return emberGenerateDestroy(['controller-test', 'foo'], (_file) => {
        expect(_file('tests/unit/controllers/foo-test.js')).to.equal(
          fixture('controller-test/addon.js')
        );
      });
    });
  });
});
