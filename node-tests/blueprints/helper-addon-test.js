'use strict';

const file = require('../helpers/file');
var blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
var setupTestHooks = blueprintHelpers.setupTestHooks;
var emberNew = blueprintHelpers.emberNew;
var emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;

var chai = require('ember-cli-blueprint-test-helpers/chai');
var expect = chai.expect;

describe('Acceptance: ember generate and destroy helper-addon', function() {
  setupTestHooks(this);

  it('in-addon helper-addon foo/bar-baz', function() {
    var args = ['helper-addon', 'foo/bar-baz'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/helpers/foo/bar-baz.js'))
          .to.equal(file('helper-addon.js'));
      }));
  });
});
