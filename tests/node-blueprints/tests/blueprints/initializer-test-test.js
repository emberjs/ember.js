'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

const fixture = require('../helpers/fixture');

describe('Blueprint: initializer-test', function () {
  setupTestHooks(this);

  describe('in app', function () {
    beforeEach(function () {
      return emberNew();
    });

    it('initializer-test foo', function () {
      return emberGenerateDestroy(['initializer-test', 'foo'], (_file) => {
        expect(_file('tests/unit/initializers/foo-test.js')).to.equal(
          fixture('initializer-test/app.js')
        );
      });
    });
  });

  describe('in addon', function () {
    beforeEach(function () {
      return emberNew({ target: 'addon' });
    });

    it('initializer-test foo', function () {
      return emberGenerateDestroy(['initializer-test', 'foo'], (_file) => {
        expect(_file('tests/unit/initializers/foo-test.js')).to.equal(
          fixture('initializer-test/addon.js')
        );
      });
    });
  });
});
