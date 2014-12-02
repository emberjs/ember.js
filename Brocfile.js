/* jshint node: true */

var EmberBuild = require('emberjs-build');
var packages   = require('./lib/packages');

var emberBuild = new EmberBuild({
  packages: packages
});

module.exports = emberBuild.getDistTrees();
