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

  it('acceptance-test foo for mocha', function() {
    // pass any additional command line options in the arguments array
    return generateAndDestroy(['acceptance-test', 'foo'], {
      packages: [
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ],
      files: [
        {
          file: 'tests/acceptance/foo-test.js',
          contains: [
            "import { describe, it, beforeEach, afterEach } from 'mocha';",
            "import { expect } from 'chai';",
            "describe('Acceptance | foo', function() {",
            "it('can visit /foo', function() {",
            "visit('/foo');",
            "andThen(function() {",
            "expect(currentURL()).to.equal('/foo');"
          ]
        }
      ]
    });
  });
});
