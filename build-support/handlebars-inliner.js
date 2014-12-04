var path = require('path');
var Funnel = require('broccoli-funnel');

var files = [
  'handlebars/exception.js',
  'handlebars/safe-string.js',
  'handlebars/utils.js',
  'handlebars/compiler/ast.js',
  'handlebars/compiler/base.js',
  'handlebars/compiler/helpers.js',
  'handlebars/compiler/parser.js',
  'handlebars/compiler/visitor.js',
  'handlebars/compiler/whitespace-control.js'
];

var root = path.join(__dirname, '..', 'node_modules', 'handlebars', 'lib');

module.exports = new Funnel(root, {
  files: files,
  destDir: '/htmlbars-syntax'
});
