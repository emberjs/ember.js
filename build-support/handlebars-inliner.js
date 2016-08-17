/* globals __dirname */

var path = require('path');
var Funnel = require('broccoli-funnel');

var root = path.dirname(require.resolve('handlebars'));

module.exports = {
  compiler: new Funnel(root, {
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
  })
}
