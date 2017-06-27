import { assign } from 'ember-utils';
import PLUGINS from '../plugins';

let USER_PLUGINS = [];

export default function compileOptions(_options) {
  let options = assign({ meta: { } }, _options);

  // move `moduleName` into `meta` property
  if (options.moduleName) {
    let meta = options.meta;
    meta.moduleName = options.moduleName;
  }

  if (!options.plugins) {
    options.plugins = { ast: [...USER_PLUGINS, ...PLUGINS] };
  } else {
    let potententialPugins = [...USER_PLUGINS, ...PLUGINS];
    let pluginsToAdd = potententialPugins.filter((plugin) => {
      return options.plugins.ast.indexOf(plugin) === -1;
    });
    options.plugins.ast = options.plugins.ast.slice().concat(pluginsToAdd);
  }

  return options;
}

export function registerPlugin(type, _plugin) {
  if (type !== 'ast') {
    throw new Error(`Attempting to register ${_plugin} as "${type}" which is not a valid Glimmer plugin type.`);
  }

  let plugin;
  if (_plugin.prototype && _plugin.prototype.transform) {
    plugin = (env) => {
      return {
        name: _plugin.constructor && _plugin.constructor.name,

        visitors: {
          Program(node) {
            let plugin = new _plugin(env);

            plugin.syntax = env.syntax;

            return plugin.transform(node);
          }
        }
        };
    };
  } else {
    plugin = _plugin;
  }

  USER_PLUGINS = [plugin, ...USER_PLUGINS];
}

export function removePlugin(type, PluginClass) {
  if (type !== 'ast') {
    throw new Error(`Attempting to unregister ${PluginClass} as "${type}" which is not a valid Glimmer plugin type.`);
  }

  USER_PLUGINS = USER_PLUGINS.filter((plugin) => plugin !== PluginClass);
}
