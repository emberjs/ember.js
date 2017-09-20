'use strict';

const file = require('../helpers/file');
var blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
var setupTestHooks = blueprintHelpers.setupTestHooks;
var emberNew = blueprintHelpers.emberNew;
var emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
var modifyPackages = blueprintHelpers.modifyPackages;
var setupPodConfig = blueprintHelpers.setupPodConfig;

var chai = require('ember-cli-blueprint-test-helpers/chai');
var expect = chai.expect;

var generateFakePackageManifest = require('../helpers/generate-fake-package-manifest');

describe('Acceptance: ember generate and destroy class-based helper', function() {
  setupTestHooks(this);

  it.only('class-based helper foo/bar-baz', function() {
    var args = ['class-helper', 'foo/bar-baz'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {

        expect(_file('app/helpers/foo/bar-baz.js'))
          .to.equal(file('class-based-helper.js'));
        // expect(_file('tests/integration/helpers/foo/bar-baz-test.js'))
        //   .to.equal(file('helper-test/integration.js'));
      }));
  });
});
