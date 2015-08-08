import Ember from 'ember-metal/core';
import calculateLocationDisplay from 'ember-template-compiler/system/calculate-location-display';

function DeprecateUnboundBlockAndMultiParam(options) {
  // set later within HTMLBars to the syntax package
  this.syntax = null;
  this.options = options || {};
}

DeprecateUnboundBlockAndMultiParam.prototype.transform = function(ast) {
  const pluginContext = this;
  const walker = new pluginContext.syntax.Walker();
  const moduleName = pluginContext.options.moduleName;

  walker.visit(ast, function(node) {

    if (pluginContext.isBlockUsage(node)) {
      let moduleInfo = calculateLocationDisplay(moduleName, node.loc);

      Ember.deprecate(
        `Using the {{unbound}} helper with a block ${moduleInfo}is deprecated and will be removed in 2.0.0.`,
        false,
        {
          id: 'ember-template-compiler.unbound-block',
          until: '2.0.0',
          url: 'http://emberjs.com/deprecations/v1.x/#toc_block-and-multi-argument-unbound-helper'
        }
      );
    } else if (pluginContext.hasMultipleParams(node)) {
      let moduleInfo = calculateLocationDisplay(moduleName, node.loc);

      Ember.deprecate(
        `Using the {{unbound}} helper with multiple params ${moduleInfo}is deprecated and will be removed in 2.0.0. Please refactor to nested helper usage.`,
        false,
        {
          id: 'ember-template-compiler.unbound-multiple-params',
          until: '2.0.0',
          url: 'http://emberjs.com/deprecations/v1.x/#toc_block-and-multi-argument-unbound-helper'
        }
      );
    }
  });

  return ast;
};

DeprecateUnboundBlockAndMultiParam.prototype.isBlockUsage = function(node) {
  return node.type === 'BlockStatement' &&
    node.path.original === 'unbound';
};

DeprecateUnboundBlockAndMultiParam.prototype.hasMultipleParams = function(node) {
  return (node.type === 'BlockStatement' || node.type === 'MustacheStatement') &&
    node.path.original === 'unbound' &&
    node.params.length > 1;
};

export default DeprecateUnboundBlockAndMultiParam;
