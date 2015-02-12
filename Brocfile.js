/* jshint node: true */

// To create fast production builds (without ES3 support, minification, derequire, or JSHint)
// run the following:
//
// DISABLE_ES3=true DISABLE_JSCS=true DISABLE_JSHINT=true DISABLE_MIN=true DISABLE_DEREQUIRE=true ember serve --environment=production

var EmberBuild = require('emberjs-build');
var packages   = require('./lib/packages');

var emberBuild = new EmberBuild({
  htmlbars: require('htmlbars'),
  packages: packages
});

module.exports = emberBuild.getDistTrees();
