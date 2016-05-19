import TransformHasBlockSyntax from '../plugins/transform-has-block-syntax';
import TransformActionSyntax from '../plugins/transform-action-syntax';
import assign from 'ember-metal/assign';

export const PLUGINS = {
  ast: [
    TransformHasBlockSyntax,
    TransformActionSyntax
  ]
};

export default function compileOptions(options) {
  options = options || {};
  options = assign({}, options);
  if (!options.plugins) {
    options.plugins = PLUGINS;
  } else {
    let pluginsToAdd = PLUGINS.ast.filter((plugin) => {
      return options.plugins.ast.indexOf(plugin) === -1;
    });

    options.plugins.ast = options.plugins.ast.slice().concat(pluginsToAdd);
  }

  return options;
}

export function registerPlugin(type, PluginClass) {
  if (type !== 'ast') {
    throw new Error(`Attempting to register ${PluginClass} as "${type}" which is not a valid Glimmer plugin type.`);
  }

  if (!PLUGINS.ast) {
    PLUGINS.ast = [PluginClass];
  } else {
    PLUGINS.ast.push(PluginClass);
  }
}

export function removePlugin(type, PluginClass) {
  if (type !== 'ast') {
    throw new Error(`Attempting to unregister ${PluginClass} as "${type}" which is not a valid Glimmer plugin type.`);
  }

  PLUGINS.ast = PLUGINS.ast.filter((plugin) => !(plugin instanceof PluginClass));
}
