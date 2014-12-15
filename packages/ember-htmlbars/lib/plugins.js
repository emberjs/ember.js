/**
@module ember
@submodule ember-htmlbars
*/

/**
 @private
 @property helpers
*/
var plugins = {
  ast: [ ]
};

/**
  Adds an AST plugin to be used by Ember.HTMLBars.compile.

  @private
  @method registerASTPlugin
*/
export function registerASTPlugin(Plugin) {
  plugins.ast.push(Plugin);
}

export default plugins;
