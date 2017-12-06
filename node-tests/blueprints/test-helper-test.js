'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

describe('Blueprint: test-helper', function() {
  setupTestHooks(this);

  it('test-helper foo', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['test-helper', 'foo'], _file => {
        expect(_file('tests/helpers/foo.js'))
          .to.contain("import { registerAsyncHelper } from '@ember/test';")
          .to.contain('export default registerAsyncHelper(\'foo\', function(app) {\n\n}');
      }));
  });
});
