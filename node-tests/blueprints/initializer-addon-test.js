'use strict';

var blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
var setupTestHooks = blueprintHelpers.setupTestHooks;
var emberNew = blueprintHelpers.emberNew;
var emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;

var chai = require('ember-cli-blueprint-test-helpers/chai');
var expect = chai.expect;

describe('Acceptance: ember generate and destroy initializer-addon', function() {
  setupTestHooks(this);

  it('initializer-addon foo', function() {
    var args = ['initializer-addon', 'foo'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/initializers/foo.js'))
          .to.contain("export { default, initialize } from 'my-addon/initializers/foo';");
      }));
  });
  
  it('initializer-addon foo --pod', function() {
    var args = ['initializer-addon', 'foo', '--pod'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/initializers/foo.js'))
          .to.contain("export { default, initialize } from 'my-addon/initializers/foo';");
      }));
  });

});
