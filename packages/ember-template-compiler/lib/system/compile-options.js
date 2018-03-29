import { assign } from 'ember-utils';
import PLUGINS from '../plugins/index';

let USER_PLUGINS = [];

export default function compileOptions(_options) {
  let options = assign({ meta: {} }, _options);

  // move `moduleName` into `meta` property
  if (options.moduleName) {
    let meta = options.meta;
    meta.moduleName = options.moduleName;
  }

  if (!options.plugins) {
    options.plugins = { ast: [...USER_PLUGINS, ...PLUGINS] };
  } else {
    let potententialPugins = [...USER_PLUGINS, ...PLUGINS];
    let providedPlugins = options.plugins.ast.map(plugin =>
      wrapLegacyPluginIfNeeded(plugin)
    );
    let pluginsToAdd = potententialPugins.filter(plugin => {
      return options.plugins.ast.indexOf(plugin) === -1;
    });
    options.plugins.ast = providedPlugins.concat(pluginsToAdd);
  }

  return options;
}

function wrapLegacyPluginIfNeeded(_plugin) {
  let plugin = _plugin;
  if (_plugin.prototype && _plugin.prototype.transform) {
    plugin = env => {
      let pluginInstantiated = false;

      return {
        name: _plugin.constructor && _plugin.constructor.name,

        visitor: {
          Program(node) {
            if (!pluginInstantiated) {
              pluginInstantiated = true;
              let plugin = new _plugin(env);

              plugin.syntax = env.syntax;

              return plugin.transform(node);
            }
          }
        }
      };
    };

    plugin.__raw = _plugin;
  }

  return plugin;
}

export function registerPlugin(type, _plugin) {
  if (type !== 'ast') {
    throw new Error(
      `Attempting to register ${_plugin} as "${type}" which is not a valid Glimmer plugin type.`
    );
  }

  for (let i = 0; i < USER_PLUGINS.length; i++) {
    let PLUGIN = USER_PLUGINS[i];
    if (PLUGIN === _plugin || PLUGIN.__raw === _plugin) {
      return;
    }
  }

  let plugin = wrapLegacyPluginIfNeeded(_plugin);

  USER_PLUGINS = [plugin, ...USER_PLUGINS];
}

export function unregisterPlugin(type, PluginClass) {
  if (type !== 'ast') {
    throw new Error(
      `Attempting to unregister ${PluginClass} as "${type}" which is not a valid Glimmer plugin type.`
    );
  }

  USER_PLUGINS = USER_PLUGINS.filter(
    plugin => plugin !== PluginClass && plugin.__raw !== PluginClass
  );
}
