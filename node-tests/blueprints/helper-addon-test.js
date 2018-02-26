'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

const fixture = require('../helpers/fixture');

describe('Blueprint: helper-addon', function() {
  setupTestHooks(this);

  describe('in addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' });
    });

    it('helper-addon foo/bar-baz', function() {
      return emberGenerateDestroy(['helper-addon', 'foo/bar-baz'], _file => {
        expect(_file('app/helpers/foo/bar-baz.js'))
          .to.equal(fixture('helper-addon.js'));
      });
    });

    it('helper-addon foo/bar-baz --pod', function() {
      return emberGenerateDestroy(['helper-addon', 'foo/bar-baz', '--pod'], _file => {
        expect(_file('app/helpers/foo/bar-baz.js'))
          .to.equal(fixture('helper-addon.js'));
      });
    });
  });
});
