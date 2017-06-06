'use strict';

var blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
var setupTestHooks = blueprintHelpers.setupTestHooks;
var emberNew = blueprintHelpers.emberNew;
var emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;

var chai = require('ember-cli-blueprint-test-helpers/chai');
var expect = chai.expect;

describe('Acceptance: ember generate and destroy instance-initializer-addon', function() {
  setupTestHooks(this);

  it('instance-initializer-addon foo', function() {
    var args = ['instance-initializer-addon', 'foo'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/instance-initializers/foo.js'))
          .to.contain("export { default, initialize } from 'my-addon/instance-initializers/foo';");
      }));
  });

  it('instance-initializer-addon foo --pod', function() {
    var args = ['instance-initializer-addon', 'foo', '--pod'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/instance-initializers/foo.js'))
          .to.contain("export { default, initialize } from 'my-addon/instance-initializers/foo';");
      }));
  });
});
