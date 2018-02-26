/* eslint-env node */
'use strict';

var fs = require('fs');
var path = require('path');
var resolve = require('resolve');

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
add(paths, 'testing', 'vendor/ember/ember-testing.js');
add(paths, 'jquery', 'vendor/ember/jquery/jquery.js');

add(absolutePaths, 'templateCompiler', __dirname + '/dist/ember-template-compiler.js');

module.exports = {
  init: function() {
		this._super.init && this._super.init.apply(this, arguments);
    if ('ember' in this.project.bowerDependencies()) {
      // TODO: move this to a throw soon.
      this.ui.writeWarnLine('Ember.js is now provided by node_module `ember-source`, please remove it from bower');
    }
  },

  name: 'ember-source',
  paths: paths,
  absolutePaths: absolutePaths,

  treeForVendor: function() {
    var Funnel = require('broccoli-funnel');
    var MergeTrees = require('broccoli-merge-trees');

    var jqueryPath;
    try {
      jqueryPath = path.dirname(resolve.sync('jquery/package.json', { basedir: this.project.root }));
    } catch (error) {
      jqueryPath = path.dirname(require.resolve('jquery/package.json'));
    }

    var jquery = new Funnel(jqueryPath + '/dist', {
      destDir: 'ember/jquery',
      files: [ 'jquery.js' ]
    });

    var emberFiles = [
      'ember-runtime.js',
      'ember-template-compiler.js',
      'ember-testing.js',
      'ember.debug.js',
      'ember.min.js',
      'ember.prod.js'
    ]
      .map(function(file) {
        return [file, file.replace('.js', '.map')];
      })
      .reduce(function(flat, jsAndMap) {
        return flat.concat(jsAndMap);
      }, [])
      .filter(function(file) {
        var fullPath = path.join(__dirname, 'dist', file);

        return fs.existsSync(fullPath);
      });

    var ember = new Funnel(__dirname + '/dist', {
      destDir: 'ember',
      files: emberFiles
    });

    return new MergeTrees([ember, jquery]);
  }
};
