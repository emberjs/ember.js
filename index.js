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
add(paths, 'shims', 'vendor/ember/shims.js');

add(absolutePaths, 'templateCompiler', __dirname + '/dist/ember-template-compiler.js');

module.exports = {
  init: function() {
    if ('ember' in this.project.bowerDependencies()) {
      throw new TypeError('Ember.js is now provided by node_module `ember-core`, please remove it from bower');
    }
  },

  name: 'ember-core',
  paths: paths,
  absolutePaths: absolutePaths,
  treeForVendor: function() {
    var ember = stew.find(__dirname + '/dist', {
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
        'ember.prod.js'
      ]
    });

    var shims = stew.find(__dirname + '/vendor/ember', {
      destDir: 'ember',
      files: [ 'shims.js' ]
    });

    return stew.find([
      ember,
      shims
    ]);
  }
};
