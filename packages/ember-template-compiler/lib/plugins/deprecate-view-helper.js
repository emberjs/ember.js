import Ember from 'ember-metal/core';
import calculateLocationDisplay from 'ember-template-compiler/system/calculate-location-display';

function DeprecateViewHelper(options) {
  // set later within HTMLBars to the syntax package
  this.syntax = null;
  this.options = options || {};
}

/**
  @private
  @method transform
  @param {AST} ast The AST to be transformed.
*/
DeprecateViewHelper.prototype.transform = function DeprecateViewHelper_transform(ast) {
  if (!!Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT) {
    return ast;
  }
  var walker = new this.syntax.Walker();
  var moduleName = this.options && this.options.moduleName;

  walker.visit(ast, function(node) {
    if (!validate(node)) { return; }

    deprecateHelper(moduleName, node);
  });

  return ast;
};

function deprecateHelper(moduleName, node) {
  const paramValue = node.params.length && node.params[0].value;

  if (!paramValue) {
    return;
  } else if (paramValue === 'select') {
    deprecateSelect(moduleName, node);
  } else {
    Ember.deprecate(`Using the \`{{view "string"}}\` helper is deprecated. ${calculateLocationDisplay(moduleName, node.loc)}`,
                    false,
                    { url: 'http://emberjs.com/deprecations/v1.x#toc_ember-view', id: 'view.helper', until: '2.0.0' });
  }
}

function deprecateSelect(moduleName, node) {
  Ember.deprecate(`Using \`{{view "select"}}\` is deprecated. ${calculateLocationDisplay(moduleName, node.loc)}`,
                  false,
                  { url: 'http://emberjs.com/deprecations/v1.x#toc_ember-select', id: 'view.helper.select', until: '2.0.0' });
}

function validate(node) {
  return (node.type === 'MustacheStatement' || node.type === 'BlockStatement') &&
    (node.path.parts[0] === 'view');
}

export default DeprecateViewHelper;
