'use strict';

var blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
var setupTestHooks = blueprintHelpers.setupTestHooks;
var emberNew = blueprintHelpers.emberNew;
var emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;

var chai = require('ember-cli-blueprint-test-helpers/chai');
var expect = chai.expect;

describe('Acceptance: ember generate and destroy helper-addon', function() {
  setupTestHooks(this);

  it('in-addon helper-addon foo-bar', function() {
    var args = ['helper-addon', 'foo-bar'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/helpers/foo-bar.js'))
          .to.contain("export { default, fooBar } from 'my-addon/helpers/foo-bar';");
      }));
  });
  
  it('in-addon helper-addon foo-bar --pod', function() {
    var args = ['helper-addon', 'foo-bar', '--pod'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/helpers/foo-bar.js'))
          .to.contain("export { default, fooBar } from 'my-addon/helpers/foo-bar';");
      }));
  });
});
