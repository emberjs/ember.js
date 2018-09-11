'use strict';

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

module.exports = function expectError(promise, expectedErrorText) {
  return promise
    .then(() => {
      throw new Error('the command should raise an exception');
    })
    .catch(error => {
      expect(error.message).to.equal(expectedErrorText);
    });
};
