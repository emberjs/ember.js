'use strict';

var blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
var setupTestHooks = blueprintHelpers.setupTestHooks;
var emberNew = blueprintHelpers.emberNew;
var emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;

var chai = require('ember-cli-blueprint-test-helpers/chai');
var expect = chai.expect;

describe('Acceptance: ember generate and destroy test-helper', function() {
  setupTestHooks(this);

  it('test-helper foo', function() {
    var args = ['test-helper', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/helpers/foo.js'))
          .to.contain("import Ember from 'ember';")
          .to.contain('export default Test.registerAsyncHelper(\'foo\', function(app) {\n\n}');
      }));
  });
});
