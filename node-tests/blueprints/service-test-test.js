'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

const fixture = require('../helpers/fixture');

describe('Blueprint: service-test', function () {
  setupTestHooks(this);

  describe('in app', function () {
    beforeEach(function () {
      return emberNew();
    });

    it('service-test foo', function () {
      return emberGenerateDestroy(['service-test', 'foo'], (_file) => {
        expect(_file('tests/unit/services/foo-test.js')).to.equal(fixture('service-test/app.js'));
      });
    });
  });

  describe('in addon', function () {
    beforeEach(function () {
      return emberNew({ target: 'addon' });
    });

    it('service-test foo', function () {
      return emberGenerateDestroy(['service-test', 'foo'], (_file) => {
        expect(_file('tests/unit/services/foo-test.js')).to.equal(fixture('service-test/addon.js'));
      });
    });
  });
});
