/* globals __dirname */

var path = require('path');
var Funnel = require('broccoli-funnel');
var mergeTrees = require('broccoli-merge-trees');

// Gather only the files we need from Handlebars npm package
var handlebarsRoot = path.dirname(require.resolve('handlebars'));
var handlebars = new Funnel(handlebarsRoot, {
    files: [
      'handlebars/utils.js',
      'handlebars/exception.js',
      'handlebars/safe-string.js',
      'handlebars/compiler/ast.js',
      'handlebars/compiler/base.js',
      'handlebars/compiler/helpers.js',
      'handlebars/compiler/parser.js',
      'handlebars/compiler/visitor.js',
      'handlebars/compiler/whitespace-control.js'
    ]
});

// Get our shim file for the Handlebars entry point, which includes just the
// parser bits and not everything else in Handlebars.
var handlebarsShim = new Funnel('packages/@glimmer/syntax', {
    files: ['handlebars-shim.js'],
    getDestinationPath(relativePath) {
      return 'handlebars.js'
    }
});

module.exports = {
  compiler: mergeTrees([handlebars, handlebarsShim])
}
