'use strict';

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

module.exports = function expectError(promise, expectedErrorText) {
  return promise
    .then(() => {
      throw 'the command should raise an exception';
    })
    .catch(error => {
      expect(error).to.equal(expectedErrorText);
    });
};
