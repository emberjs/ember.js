'use strict';

var setupTestHooks     = require('ember-cli-blueprint-test-helpers/lib/helpers/setup');
var BlueprintHelpers   = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');
var generateAndDestroy = BlueprintHelpers.generateAndDestroy;

describe('Acceptance: ember generate and destroy test-helper', function() {
  setupTestHooks(this);

  it('test-helper foo', function() {
    return generateAndDestroy(['test-helper', 'foo'], {
      files: [
        {
          file: 'tests/helpers/foo.js',
          contains: [
            "import Ember from 'ember';",
            'export default Ember.Test.registerAsyncHelper(\'foo\', function(app) {\n\n}'
          ]
        }
      ]
    });
  });
});
