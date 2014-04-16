var fs = require('fs');
var path = require('path');
var Filter = require('broccoli-filter');
var helpers = require('broccoli-kitchen-sink-helpers')

module.exports = EmberInlineTemplatePrecompiler;
EmberInlineTemplatePrecompiler.prototype = Object.create(Filter.prototype);
EmberInlineTemplatePrecompiler.prototype.constructor = EmberInlineTemplatePrecompiler;
function EmberInlineTemplatePrecompiler (inputTree, options) {
  if (!(this instanceof EmberInlineTemplatePrecompiler)) return new EmberInlineTemplatePrecompiler(inputTree, options);

  options = options || {};
  this.inputTree = inputTree;
  this.compilerPath = options.compilerPath || 'ember-template-compiler.js';
  this.inlineTemplateRegExp = /precompileTemplate\(['"](.*)['"]\)/;
};

EmberInlineTemplatePrecompiler.prototype.extensions = ['js'];
EmberInlineTemplatePrecompiler.prototype.targetExtension = 'js';

EmberInlineTemplatePrecompiler.prototype.processFile = function (srcDir, destDir, relativePath) {
  var self = this
  var compilerPath = path.join(srcDir, this.compilerPath);
  var compiler = require(path.resolve(compilerPath));

  var inputString = fs.readFileSync(srcDir + '/' + relativePath, { encoding: 'utf8' })
  var outputPath = this.getDestFilePath(relativePath)
  var outputString = processTemplates();

  fs.writeFileSync(destDir + '/' + outputPath, outputString, { encoding: 'utf8' })

  function processTemplates() {
    var nextIndex;
    getNextIndex();

    while (nextIndex > -1) {
      var match = inputString.match(self.inlineTemplateRegExp);
      var template = "Ember.Handlebars.template(" + compiler.precompile(match[1]).toString() + ")";

      inputString = inputString.replace(match[0], template);

      getNextIndex();
    }

    function getNextIndex() {
      nextIndex = inputString.search(self.inlineTemplateRegExp);
    }

    return inputString;
  }
}
