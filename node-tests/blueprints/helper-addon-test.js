'use strict';

var setupTestHooks     = require('ember-cli-blueprint-test-helpers/lib/helpers/setup');
var BlueprintHelpers   = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');
var generateAndDestroy = BlueprintHelpers.generateAndDestroy;

describe('Acceptance: ember generate and destroy helper-addon', function() {
  setupTestHooks(this);

  it('in-addon helper-addon foo-bar', function() {
    return generateAndDestroy(['helper-addon', 'foo-bar'], {
      target: 'addon',
      files: [
        {
          file: 'app/helpers/foo-bar.js',
          contains: [
            "export { default, fooBar } from 'my-addon/helpers/foo-bar';"
          ]
        },
      ]
    });
  });

});
