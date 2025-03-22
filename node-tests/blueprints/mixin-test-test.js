'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

const fixture = require('../helpers/fixture');

describe('Blueprint: mixin-test', function () {
  setupTestHooks(this);

  describe('in app', function () {
    beforeEach(function () {
      return emberNew();
    });

    it('mixin-test foo', function () {
      return emberGenerateDestroy(['mixin-test', 'foo'], (_file) => {
        expect(_file('tests/unit/mixins/foo-test.js')).to.equal(fixture('mixin-test/rfc232.js'));
      });
    });
  });

  describe('in addon', function () {
    beforeEach(function () {
      return emberNew({ target: 'addon' });
    });

    it('mixin-test foo', function () {
      return emberGenerateDestroy(['mixin-test', 'foo'], (_file) => {
        expect(_file('tests/unit/mixins/foo-test.js')).to.equal(fixture('mixin-test/addon.js'));
      });
    });
  });

  describe('in in-repo-addon', function () {
    beforeEach(function () {
      return emberNew({ target: 'in-repo-addon' });
    });

    it('mixin-test foo --in-repo-addon=my-addon', function () {
      return emberGenerateDestroy(['mixin-test', 'foo', '--in-repo-addon=my-addon'], (_file) => {
        expect(_file('tests/unit/mixins/foo-test.js')).to.equal(fixture('mixin-test/addon.js'));
      });
    });
  });
});
