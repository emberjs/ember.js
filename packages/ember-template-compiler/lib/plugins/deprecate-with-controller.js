import Ember from 'ember-metal/core';
import calculateLocationDisplay from 'ember-template-compiler/system/calculate-location-display';

/**
 @module ember
 @submodule ember-template-compiler
*/

/**
  An HTMLBars AST transformation that deprecates usage of `controller` with the `{{with}}`
  helper.

  @private
  @class DeprecateWithController
*/
function DeprecateWithController(options) {
  // set later within HTMLBars to the syntax package
  this.syntax = null;
  this.options = options || {};
}

/**
  @private
  @method transform
  @param {AST} ast The AST to be transformed.
*/
DeprecateWithController.prototype.transform = function DeprecateWithController_transform(ast) {
  const pluginContext = this;
  const walker = new pluginContext.syntax.Walker();
  const moduleName = pluginContext.options.moduleName;

  walker.visit(ast, function(node) {
    if (pluginContext.validate(node)) {
      let moduleInfo = calculateLocationDisplay(moduleName, node.loc);

      Ember.deprecate(
        `Using the {{with}} helper with a \`controller\` specified ${moduleInfo}is deprecated and will be removed in 2.0.0.`,
        false,
        { id: 'ember-template-compiler.with-controller', until: '2.0.0' }
      );
    }
  });

  return ast;
};

DeprecateWithController.prototype.validate = function TransformWithAsToHash_validate(node) {
  return (node.type === 'BlockStatement' || node.type === 'MustacheStatement') &&
    node.path.original === 'with' &&
    hashPairForKey(node.hash, 'controller');
};

function hashPairForKey(hash, key) {
  for (let i = 0, l = hash.pairs.length; i < l; i++) {
    let pair = hash.pairs[i];
    if (pair.key === key) {
      return pair;
    }
  }

  return false;
}

export default DeprecateWithController;
