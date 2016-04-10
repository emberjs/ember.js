'use strict';

var blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
var setupTestHooks = blueprintHelpers.setupTestHooks;
var emberNew = blueprintHelpers.emberNew;
var emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;

var chai = require('ember-cli-blueprint-test-helpers/chai');
var expect = chai.expect;

describe('Acceptance: ember generate and destroy route-addon', function() {
  setupTestHooks(this);

  it('route-addon foo', function() {
    var args = ['route-addon', 'foo'];

    return emberNew({ target: 'addon' }).then(() => emberGenerateDestroy(args, _file => {
      expect(_file('app/routes/foo.js'))
        .to.contain("export { default } from 'my-addon/routes/foo';");

      expect(_file('app/templates/foo.js'))
        .to.contain("export { default } from 'my-addon/templates/foo';");
    }));
  });
});
