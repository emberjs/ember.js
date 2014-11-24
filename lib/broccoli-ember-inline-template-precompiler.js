/*jshint node: true */
var fs = require('fs');
var path = require('path');
var Filter = require('broccoli-filter');

module.exports = EmberTemplatePrecompiler;
EmberTemplatePrecompiler.prototype = Object.create(Filter.prototype);
EmberTemplatePrecompiler.prototype.constructor = EmberTemplatePrecompiler;
function EmberTemplatePrecompiler (inputTree, options) {
  if (!(this instanceof EmberTemplatePrecompiler)) return new EmberTemplatePrecompiler(inputTree, options);

  options = options || {};
  this.inputTree = inputTree;
  this.handlebarsCompilerPath = options.compilerPath || 'ember-template-compiler.js';
  this.htmlbarsCompiler = require('htmlbars').compileSpec;
}

EmberTemplatePrecompiler.prototype.extensions = ['hbs'];
EmberTemplatePrecompiler.prototype.targetExtension = 'js';

EmberTemplatePrecompiler.prototype.processString = function(content, relativePath) {
  var handlebarsCompilerPath = path.join(this._srcDir, this.handlebarsCompilerPath);
  var handlebarsCompiler = require(path.resolve(handlebarsCompilerPath));

  var template;
  if (relativePath.match(/handlebars/)) {
    template = 'import EmberHandlebars from "ember-handlebars-compiler";\n';
    template += "export default EmberHandlebars.template(" + handlebarsCompiler.precompile(content, false) + ");";
  } else if (relativePath.match(/htmlbars/)) {
    template = 'import template from "ember-htmlbars/system/template";\n';
    template += "var t = " + this.htmlbarsCompiler(content) + ";\n export default template(t);";
  }

  return template;
};

EmberTemplatePrecompiler.prototype.processFile = function (srcDir, destDir, relativePath) {
  this._srcDir = srcDir;

  return Filter.prototype.processFile.apply(this, arguments);
};
