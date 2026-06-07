'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

const fixture = require('../helpers/fixture');

describe('Blueprint: instance-initializer-test', function () {
  setupTestHooks(this);

  describe('in app', function () {
    beforeEach(function () {
      return emberNew();
    });

    it('instance-initializer-test foo', function () {
      return emberGenerateDestroy(['instance-initializer-test', 'foo'], (_file) => {
        expect(_file('tests/unit/instance-initializers/foo-test.js')).to.equal(
          fixture('instance-initializer-test/app.js')
        );
      });
    });
  });

  describe('in addon', function () {
    beforeEach(function () {
      return emberNew({ target: 'addon' });
    });

    it('instance-initializer-test foo', function () {
      return emberGenerateDestroy(['instance-initializer-test', 'foo'], (_file) => {
        expect(_file('tests/unit/instance-initializers/foo-test.js')).to.equal(
          fixture('instance-initializer-test/addon.js')
        );
      });
    });
  });
});
