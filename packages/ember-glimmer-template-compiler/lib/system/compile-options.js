import TransformHasBlockSyntax from '../plugins/transform-has-block-syntax';
import TransformActionSyntax from '../plugins/transform-action-syntax';
import assign from 'ember-metal/assign';

export const PLUGINS = [
  TransformHasBlockSyntax,
  TransformActionSyntax
];

let USER_PLUGINS = [];

export default function compileOptions(options) {
  options = options || {};
  options = assign({}, options);
  if (!options.plugins) {
    options.plugins = PLUGINS;
  } else {
    let potententialPugins = [...USER_PLUGINS, ...PLUGINS];
    let pluginsToAdd = potententialPugins.filter((plugin) => {
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

  if (USER_PLUGINS.indexOf(PluginClass) === -1) {
    USER_PLUGINS = [PluginClass, ...USER_PLUGINS];
  }
}

export function removePlugin(type, PluginClass) {
  if (type !== 'ast') {
    throw new Error(`Attempting to unregister ${PluginClass} as "${type}" which is not a valid Glimmer plugin type.`);
  }

  USER_PLUGINS = USER_PLUGINS.filter((plugin) => plugin !== PluginClass);
}
