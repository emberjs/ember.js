/* globals __dirname */

var path = require('path');
var Funnel = require('broccoli-funnel');
var mergeTrees = require('broccoli-merge-trees');
var rename = require('broccoli-stew').rename;

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

// Get our shim file for the Handlebars entry point, which includes just the parser bits and not everything else in Handlebars.
var glimmerSyntaxRoot = __dirname + "/../packages/glimmer-syntax";
var handlebarsShim = rename(new Funnel(glimmerSyntaxRoot, {
    files: ['handlebars-shim.js']
}), 'handlebars-shim.js', 'handlebars.js');

module.exports = {
  compiler: mergeTrees([handlebars, handlebarsShim])
}
