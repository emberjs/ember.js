var fs = require('fs');
var path = require('path');
var Writer = require('broccoli-writer');
var helpers = require('broccoli-kitchen-sink-helpers')

module.exports = EmberTemplateCompilerGenerator;
EmberTemplateCompilerGenerator.prototype = Object.create(Writer.prototype);
EmberTemplateCompilerGenerator.prototype.constructor = EmberTemplateCompilerGenerator;
function EmberTemplateCompilerGenerator (inputTree, options) {
  if (!(this instanceof EmberTemplateCompilerGenerator)) return new EmberTemplateCompilerGenerator(inputTree, options);

  options = options || {};
  this.inputTree = inputTree;
  this.srcFile   = options.srcFile || 'ember-handlebars-compiler.js';
  this.destFile  = options.destFile || 'ember-template-compiler.js';
};

EmberTemplateCompilerGenerator.prototype.write = function (readTree, destDir) {
  var self = this

  return readTree(this.inputTree).then(function (srcDir) {
    var output = '(function() {\nvar Ember = { assert: function() {}, FEATURES: { isEnabled: function() {} } };\n';
    output += fs.readFileSync(path.join(srcDir, self.srcFile), {encoding: 'utf8'});

    output = output.replace('import Ember from "ember-metal/core";', '');
    output = output.replace('export default EmberHandlebars;', '');

    output += '\nexports.precompile = EmberHandlebars.precompile;';
    output += '\nexports.EmberHandlebars = EmberHandlebars;';
    output += '\n})();';

    fs.writeFileSync(path.join(destDir, self.destFile), output);
  })
};
