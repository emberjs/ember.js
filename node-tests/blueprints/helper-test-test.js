'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

const fixture = require('../helpers/fixture');

describe('Blueprint: helper-test', function () {
  setupTestHooks(this);

  describe('in app', function () {
    beforeEach(function () {
      return emberNew();
    });

    it('helper-test foo', function () {
      return emberGenerateDestroy(['helper-test', 'foo'], (_file) => {
        expect(_file('tests/integration/helpers/foo-test.js')).to.equal(
          fixture('helper-test/rfc232.js')
        );
      });
    });

    it('helper-test foo/bar-baz', function () {
      return emberGenerateDestroy(['helper-test', 'foo/bar-baz'], (_file) => {
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js')).to.equal(
          fixture('helper-test/nested.js')
        );
      });
    });
  });

  describe('in addon', function () {
    beforeEach(function () {
      return emberNew({ target: 'addon' });
    });

    it('helper-test foo', function () {
      return emberGenerateDestroy(['helper-test', 'foo'], (_file) => {
        expect(_file('tests/integration/helpers/foo-test.js')).to.equal(
          fixture('helper-test/rfc232-addon.js')
        );
      });
    });

    it('helper-test foo/bar-baz', function () {
      return emberGenerateDestroy(['helper-test', 'foo/bar-baz'], (_file) => {
        expect(_file('tests/integration/helpers/foo/bar-baz-test.js')).to.equal(
          fixture('helper-test/addon-nested.js')
        );
      });
    });
  });
});
