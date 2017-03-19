/*jshint node:true*/

var buildPackages = require('./build/broccoli/build-packages');
var buildTests = require('./build/broccoli/build-tests');

/**
 * For development, we build tests and library code only in AMD. For publishing
 * packages, we use @glimmer/build to build each package in multiple formats.
 */
module.exports = function(_options) {
  if (process.env.EMBER_ENV === 'production') {
    return buildPackages();
  } else {
    return buildTests();
  }
}