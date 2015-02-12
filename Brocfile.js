/* jshint node: true */

// To create fast production builds (without ES3 support, minification, derequire, or JSHint)
// run the following:
//
// DISABLE_ES3=true DISABLE_JSCS=true DISABLE_JSHINT=true DISABLE_MIN=true DISABLE_DEREQUIRE=true ember serve --environment=production

var EmberBuild = require('emberjs-build');
var packages   = require('./lib/packages');

var vendoredPackage    = require('emberjs-build/lib/vendored-package');
var htmlbarsPackage    = require('emberjs-build/lib/htmlbars-package');
var vendoredES6Package = require('emberjs-build/lib/es6-vendored-package');

var emberBuild = new EmberBuild({
  htmlbars: require('htmlbars'),
  packages: packages,
  vendoredPackages: {
      'loader':                vendoredPackage('loader'),
      'rsvp':                  vendoredES6Package('rsvp'),
      'backburner':            vendoredES6Package('backburner'),
      'router':                vendoredES6Package('router.js'),
      'dag-map':               vendoredES6Package('dag-map'),
      'route-recognizer':      htmlbarsPackage('route-recognizer', { libPath: 'node_modules/route-recognizer/dist/es6/' }),
      'dom-helper':            htmlbarsPackage('dom-helper'),
      'morph-range':           htmlbarsPackage('morph-range'),
      'morph-attr':            htmlbarsPackage('morph-attr'),
      'htmlbars-runtime':      htmlbarsPackage('htmlbars-runtime'),
      'htmlbars-compiler':     htmlbarsPackage('htmlbars-compiler'),
      'htmlbars-syntax':       htmlbarsPackage('htmlbars-syntax'),
      'simple-html-tokenizer': htmlbarsPackage('simple-html-tokenizer'),
      'htmlbars-test-helpers': htmlbarsPackage('htmlbars-test-helpers', { singleFile: true }),
      'htmlbars-util':         htmlbarsPackage('htmlbars-util')
    }
});

module.exports = emberBuild.getDistTrees();
