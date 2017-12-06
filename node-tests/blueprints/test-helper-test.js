'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

describe('Acceptance: ember generate and destroy test-helper', function() {
  setupTestHooks(this);

  it('test-helper foo', function() {
    let args = ['test-helper', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/helpers/foo.js'))
          .to.contain("import { registerAsyncHelper } from '@ember/test';")
          .to.contain('export default registerAsyncHelper(\'foo\', function(app) {\n\n}');
      }));
  });
});
