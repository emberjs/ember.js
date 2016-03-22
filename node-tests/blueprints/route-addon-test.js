'use strict';

var setupTestHooks     = require('ember-cli-blueprint-test-helpers/lib/helpers/setup');
var BlueprintHelpers   = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');
var generateAndDestroy = BlueprintHelpers.generateAndDestroy;

describe('Acceptance: ember generate and destroy route-addon', function() {
  setupTestHooks(this);

  it('route-addon foo', function() {
    return generateAndDestroy(['route-addon', 'foo'], {
      target: 'addon',
      files: [
        {
          file: 'app/routes/foo.js',
          contains: [
            "export { default } from 'my-addon/routes/foo';"
          ]
        },
        {
          file: 'app/templates/foo.js',
          contains: [
            "export { default } from 'my-addon/templates/foo';"
          ]
        },
      ]
    });
  });

});
