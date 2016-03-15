'use strict';

var setupTestHooks     = require('ember-cli-blueprint-test-helpers/lib/helpers/setup');
var BlueprintHelpers   = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');
var generateAndDestroy = BlueprintHelpers.generateAndDestroy;

describe('Acceptance: ember generate and destroy template', function() {
  setupTestHooks(this);

  it('template foo', function() {
    return generateAndDestroy(['template', 'foo'], {
      files: [
        { file: 'app/templates/foo.hbs', isEmpty: true }
      ]
    });
  });

  it('template foo/bar', function() {
    return generateAndDestroy(['template', 'foo/bar'], {
      files: [
        { file: 'app/templates/foo/bar.hbs', isEmpty: true }
      ]
    });
  });

  it('template foo --pod', function() {
    return generateAndDestroy(['template', 'foo'], {
      usePods: true,
      files: [
        { file: 'app/foo/template.hbs', isEmpty: true }
      ]
    });
  });

  it('template foo/bar --pod', function() {
    return generateAndDestroy(['template', 'foo/bar'], {
      usePods: true,
      files: [
        { file: 'app/foo/bar/template.hbs', isEmpty: true }
      ]
    });
  });

  it('template foo --pod podModulePrefix', function() {
    return generateAndDestroy(['template', 'foo'], {
      usePods: true,
      podModulePrefix: true,
      files: [
        { file: 'app/pods/foo/template.hbs', isEmpty: true }
      ]
    });
  });

  it('template foo/bar --pod podModulePrefix', function() {
    return generateAndDestroy(['template', 'foo/bar'], {
      usePods: true,
      podModulePrefix: true,
      files: [
        { file: 'app/pods/foo/bar/template.hbs', isEmpty: true }
      ]
    });
  });

  it('in-addon template foo', function() {
    return generateAndDestroy(['template', 'foo'], {
      target: 'addon',
      files: [
        { file: 'addon/templates/foo.hbs', isEmpty: true }
      ]
    });
  });

  it('in-addon template foo/bar', function() {
    return generateAndDestroy(['template', 'foo/bar'], {
      target: 'addon',
      files: [
        { file: 'addon/templates/foo/bar.hbs', isEmpty: true }
      ]
    });
  });

  it('dummy template foo', function() {
    return generateAndDestroy(['template', 'foo', '--dummy'], {
      target: 'addon',
      files: [
        { file: 'tests/dummy/app/templates/foo.hbs', isEmpty: true }
      ]
    });
  });

  it('dummy template foo/bar', function() {
    return generateAndDestroy(['template', 'foo/bar', '--dummy'], {
      target: 'addon',
      files: [
        { file: 'tests/dummy/app/templates/foo/bar.hbs', isEmpty: true }
      ]
    });
  });

  it('in-repo-addon template foo', function() {
    return generateAndDestroy(['template', 'foo', '--in-repo-addon=my-addon'], {
      target: 'inRepoAddon',
      files: [
        { file: 'lib/my-addon/addon/templates/foo.hbs', isEmpty: true }
      ]
    });
  });

  it('in-repo-addon template foo/bar', function() {
    return generateAndDestroy(['template', 'foo/bar', '--in-repo-addon=my-addon'], {
      target: 'inRepoAddon',
      files: [
        { file: 'lib/my-addon/addon/templates/foo/bar.hbs', isEmpty: true }
      ]
    });
  });

});
