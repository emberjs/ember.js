/* eslint-env node */
'use strict';

var Filter = require('broccoli-persistent-filter');

GlimmerTemplatePrecompiler.prototype = Object.create(Filter.prototype);

function GlimmerTemplatePrecompiler (inputTree, options) {
  if (!(this instanceof GlimmerTemplatePrecompiler)) {
    return new GlimmerTemplatePrecompiler(inputTree, options);
  }

  Filter.call(this, inputTree, {});

  this.inputTree = inputTree;
  if (!options.glimmer) {
    throw new Error('No glimmer option provided!');
  }
  this.precompile = options.glimmer.precompile;
}

GlimmerTemplatePrecompiler.prototype.extensions = ['hbs'];
GlimmerTemplatePrecompiler.prototype.targetExtension = 'js';

GlimmerTemplatePrecompiler.prototype.baseDir = function() {
  return __dirname;
};

GlimmerTemplatePrecompiler.prototype.processString = function(content, relativePath) {
  var compiled = this.precompile(content, { meta: { moduleName: relativePath } });
  var template = 'import template from "../template";\n';
  template += 'export default template(' + compiled + ');';

  return template;
};

module.exports = GlimmerTemplatePrecompiler;