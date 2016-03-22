'use strict';

var tmpenv             = require('ember-cli-blueprint-test-helpers/lib/helpers/tmp-env');
var setupTestHooks     = require('ember-cli-blueprint-test-helpers/lib/helpers/setup');
var BlueprintHelpers   = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');
var generateAndDestroy = BlueprintHelpers.generateAndDestroy;

describe('Acceptance: ember generate and destroy instance-initializer-addon', function() {
  setupTestHooks(this, tmpenv);

  it('instance-initializer-addon foo', function() {
    // pass any additional command line options in the arguments array
    return generateAndDestroy(['instance-initializer-addon', 'foo'], {
      // define files to assert, and their contents
      target: 'addon',
      files: [
        {
          file: 'app/instance-initializers/foo.js',
          contains: "export { default, initialize } from 'my-addon/instance-initializers/foo';"
        }
      ]
    });
  });

});
