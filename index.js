/* jshint node: true */
'use strict';
var stew = require('broccoli-stew');

var paths = {};
var absolutePaths = {};

function add(paths, name, path) {
  Object.defineProperty(paths, name, {
    configurable: false,
    get: function() { return path; }
  });
}

add(paths, 'prod',  'vendor/ember/ember.prod.js');
add(paths, 'debug', 'vendor/ember/ember.debug.js');

add(absolutePaths, 'templateCompiler', __dirname + '/dist/ember-template-compiler.js');

module.exports = {
  name: 'ember-source',
  paths: paths,
  absolutePaths: absolutePaths,
  treeForVendor: function() {
    return stew.find(__dirname + '/dist', {
      destDir: 'ember',
      files: [
        'ember-runtime.js',
        'ember-runtime.map',
        'ember-template-compiler.js',
        'ember-template-compiler.map',
        'ember-testing.js',
        'ember.debug.cjs.js',
        'ember.debug.cjs.map',
        'ember.debug.js',
        'ember.min.js',
        'ember.prod.js',
        // 'shims/shims.js'
      ]
    });
  }
};
