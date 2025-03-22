'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

const fixture = require('../helpers/fixture');

describe('Blueprint: util-test', function () {
  setupTestHooks(this);

  describe('in app', function () {
    beforeEach(function () {
      return emberNew();
    });

    it('util-test foo-bar', function () {
      return emberGenerateDestroy(['util-test', 'foo-bar'], (_file) => {
        expect(_file('tests/unit/utils/foo-bar-test.js')).to.equal(fixture('util-test/rfc232.js'));
      });
    });
  });

  describe('in addon', function () {
    beforeEach(function () {
      return emberNew({ target: 'addon' });
    });

    it('util-test foo-bar', function () {
      return emberGenerateDestroy(['util-test', 'foo-bar'], (_file) => {
        expect(_file('tests/unit/utils/foo-bar-test.js')).to.equal(fixture('util-test/addon.js'));
      });
    });
  });
});
