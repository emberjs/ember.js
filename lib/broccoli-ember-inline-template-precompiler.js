/*jshint node: true */
var fs = require('fs');
var path = require('path');
var Filter = require('broccoli-filter');

module.exports = EmberInlineTemplatePrecompiler;
EmberInlineTemplatePrecompiler.prototype = Object.create(Filter.prototype);
EmberInlineTemplatePrecompiler.prototype.constructor = EmberInlineTemplatePrecompiler;
function EmberInlineTemplatePrecompiler (inputTree, options) {
  if (!(this instanceof EmberInlineTemplatePrecompiler)) return new EmberInlineTemplatePrecompiler(inputTree, options);

  options = options || {};
  this.inputTree = inputTree;
  this.compilerPath = options.compilerPath || 'ember-template-compiler.js';
  this.inlineTemplateRegExp = /precompileTemplate\(['"](.*)['"]\)/;
  // Used for replacing the original variable declaration to satisfy JSHint.
  // For example, removes `var precompileTemplate = Ember.Handlebars.compile;`.
  this.precompileTemplateVarRegex = /var precompileTemplate =.*\n/g;
}

EmberInlineTemplatePrecompiler.prototype.extensions = ['js'];
EmberInlineTemplatePrecompiler.prototype.targetExtension = 'js';

EmberInlineTemplatePrecompiler.prototype.processFile = function (srcDir, destDir, relativePath) {
  var self = this;
  var compilerPath = path.join(srcDir, this.compilerPath);
  var compiler = require(path.resolve(compilerPath));

  var inputString = fs.readFileSync(srcDir + '/' + relativePath, { encoding: 'utf8' });
  var outputPath = this.getDestFilePath(relativePath);
  var outputString = processTemplates().replace(this.precompileTemplateVarRegex, '');

  fs.writeFileSync(destDir + '/' + outputPath, outputString, { encoding: 'utf8' });

  function processTemplates() {
    var nextIndex;
    getNextIndex();

    while (nextIndex > -1) {
      var match = inputString.match(self.inlineTemplateRegExp);
      var template = "Ember.Handlebars.template(" + compiler.precompile(match[1], false) + ")";

      inputString = inputString.replace(match[0], template);

      getNextIndex();
    }

    function getNextIndex() {
      nextIndex = inputString.search(self.inlineTemplateRegExp);
    }

    return inputString;
  }
};
