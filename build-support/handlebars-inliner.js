var path = require('path');
var Funnel = require('broccoli-funnel');

var root = path.join(__dirname, '..', 'node_modules', 'handlebars', 'lib');

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
  }),

  runtime: new Funnel(root, {
    files: [
      'handlebars/utils.js',
      'handlebars/safe-string.js'
    ]
  })
}
