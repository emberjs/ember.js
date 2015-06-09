import Ember from "ember-metal/core";
import calculateLocationDisplay from "ember-template-compiler/system/calculate-location-display";

function DeprecateViewAndControllerPaths(options) {
  // set later within HTMLBars to the syntax package
  this.syntax = null;
  this.options = options || {};
}

/**
  @private
  @method transform
  @param {AST} ast The AST to be transformed.
*/
DeprecateViewAndControllerPaths.prototype.transform = function DeprecateViewAndControllerPaths_transform(ast) {
  if (!!Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT) {
    return;
  }
  var walker = new this.syntax.Walker();
  var moduleName = this.options && this.options.moduleName;

  walker.visit(ast, function(node) {
    if (!validate(node)) { return; }

    deprecatePath(moduleName, node, node.path);
    deprecatePaths(moduleName, node, node.params);
    deprecateHash(moduleName, node, node.hash);

  });

  return ast;
};

function deprecateHash(moduleName, node, hash) {
  if (!hash || !hash.pairs) {
    return;
  }
  var i, l, pair, paths;
  for (i=0, l=hash.pairs.length;i<l;i++) {
    pair = hash.pairs[i];
    paths = pair.value.params;
    deprecatePaths(moduleName, pair, paths);
  }
}

function deprecatePaths(moduleName, node, paths) {
  if (!paths) {
    return;
  }
  var i, l, path;
  for (i=0, l=paths.length;i<l;i++) {
    path = paths[i];
    deprecatePath(moduleName, node, path);
  }
}

function deprecatePath(moduleName, node, path) {
  Ember.deprecate(`Using \`{{${path && path.type === 'PathExpression' && path.parts[0]}}}\` or any path based on it ${calculateLocationDisplay(moduleName, node.loc)}has been deprecated.`, !(path && path.type === 'PathExpression' && (path.parts[0] === 'view' || path.parts[0] === 'controller')), { url: 'http://emberjs.com/deprecations/v1.x#toc_view-and-controller-template-keywords', id: 'view-controller-keyword' });
}

function validate(node) {
  return node.type === 'MustacheStatement' || node.type === 'BlockStatement';
}

export default DeprecateViewAndControllerPaths;
