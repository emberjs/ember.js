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
add(paths, 'jquery', 'vendor/ember/jquery/jquery.js');

add(absolutePaths, 'templateCompiler', __dirname + '/dist/ember-template-compiler.js');

module.exports = {
  init: function() {
		this._super.init && this._super.init.apply(this, arguments);
    if ('ember' in this.project.bowerDependencies()) {
      // TODO: move this to a throw soon.
      this.ui.writeWarnLine('Ember.js is now provided by node_module `ember-core`, please remove it from bower');
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
        'ember-template-compiler.js',
        'ember-testing.js',
        'ember.debug.js',
        'ember.min.js',
        'ember.prod.js',
        'jquery/jquery.js'
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
