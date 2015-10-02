'use strict';

var path = require('path');
var Funnel = require('broccoli-funnel');
var UnwatchedTree = require('broccoli-unwatched-tree');
var mergeTrees = require('broccoli-merge-trees');

module.exports = {
  name: 'ember',
  blueprintsPath: function() {
    return path.join(__dirname, 'blueprints');
  },

  treeFor: function(type) {
    // TODO: with the linker/packager work, this will eventually be auto-resolved
    if (type === 'vendor') {
      return new Funnel(new UnwatchedTree(__dirname + '/dist'), {
        destDir: 'ember',
        files: [
          'ember-runtime.js',
          'ember-runtime.map',
          'ember-template-compiler.js',
          'ember-template-compiler.map',
          'ember-testing.js',
          'ember-tests.js',
          'ember-tests.prod.js',
          'ember.debug.cjs.js',
          'ember.debug.cjs.map',
          'ember.debug.js',
          'ember.js',
          'ember.min.js',
          'ember.prod.js',
          'shims/shims.js'
        ]
      });
    }
  }
};
