'use strict';

var setupTestHooks     = require('ember-cli-blueprint-test-helpers/lib/helpers/setup');
var BlueprintHelpers   = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');
var generateAndDestroy = BlueprintHelpers.generateAndDestroy;

describe('Acceptance: ember generate and destroy acceptance-test', function() {
  setupTestHooks(this);

  it('acceptance-test foo', function() {
    // pass any additional command line options in the arguments array
    return generateAndDestroy(['acceptance-test', 'foo'], {
      files: [
        {
          file: 'tests/acceptance/foo-test.js',
          contains: [
            "import { test } from 'qunit';",
            "moduleForAcceptance('Acceptance | foo');",
            "test('visiting /foo', function(assert) {",
            "visit('/foo');",
            "andThen(function() {",
            "assert.equal(currentURL(), '/foo');"
          ]
        }
      ]
    });
  });

  it('in-addon acceptance-test foo', function() {
    return generateAndDestroy(['acceptance-test', 'foo'], {
      target: 'addon',
      files: [
        {
          file: 'tests/acceptance/foo-test.js',
          contains: [
            "import { test } from 'qunit';",
            "moduleForAcceptance('Acceptance | foo');",
            "test('visiting /foo', function(assert) {",
            "visit('/foo');",
            "andThen(function() {",
            "assert.equal(currentURL(), '/foo');"
          ]
        },
        {
          file: 'app/acceptance-tests/foo.js',
          exists: false
        }
      ]
    });
  });

  it('in-addon acceptance-test foo/bar', function() {
    return generateAndDestroy(['acceptance-test', 'foo/bar'], {
        target: 'addon',
        files: [
          {
            file: 'tests/acceptance/foo/bar-test.js',
            contains: [
              "import { test } from 'qunit';",
              "moduleForAcceptance('Acceptance | foo/bar');",
              "test('visiting /foo/bar', function(assert) {",
              "visit('/foo/bar');",
              "andThen(function() {",
              "assert.equal(currentURL(), '/foo/bar');"
            ]
          },
          {
            file: 'app/acceptance-tests/foo/bar.js',
            exists: false
          }
        ]
    });
  });

});
