import { assign } from '@ember/polyfills';
import { PrecompileOptions } from '@glimmer/compiler';
import { AST, ASTPlugin, ASTPluginEnvironment, Syntax } from '@glimmer/syntax';
import PLUGINS, { APluginFunc } from '../plugins/index';
import COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE from './dasherize-component-name';

type PluginFunc = APluginFunc & {
  __raw?: LegacyPluginClass | undefined;
};
let USER_PLUGINS: PluginFunc[] = [];

interface Plugins {
  ast: PluginFunc[];
}

export interface CompileOptions {
  meta?: any;
  moduleName?: string | undefined;
  plugins?: Plugins | undefined;
}

export default function compileOptions(_options: Partial<CompileOptions>): PrecompileOptions {
  let options = assign({ meta: {} }, _options, {
    customizeComponentName(tagname: string): string {
      return COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get(tagname);
    },
  });

  // move `moduleName` into `meta` property
  if (options.moduleName) {
    let meta = options.meta;
    meta.moduleName = options.moduleName;
  }

  if (!options.plugins) {
    options.plugins = { ast: [...USER_PLUGINS, ...PLUGINS] };
  } else {
    let potententialPugins = [...USER_PLUGINS, ...PLUGINS];
    let providedPlugins = options.plugins.ast.map(plugin => wrapLegacyPluginIfNeeded(plugin));
    let pluginsToAdd = potententialPugins.filter(plugin => {
      return options.plugins!.ast.indexOf(plugin) === -1;
    });
    options.plugins.ast = providedPlugins.concat(pluginsToAdd);
  }

  return options;
}

interface LegacyPlugin {
  transform(node: AST.Program): AST.Node;
  syntax: Syntax;
}
type LegacyPluginClass = new (env: ASTPluginEnvironment) => LegacyPlugin;

function wrapLegacyPluginIfNeeded(_plugin: PluginFunc | LegacyPluginClass): PluginFunc {
  let plugin = _plugin;
  if (_plugin.prototype && _plugin.prototype.transform) {
    const pluginFunc: PluginFunc = (env: ASTPluginEnvironment): ASTPlugin => {
      let pluginInstantiated = false;

      return {
        name: _plugin.constructor && _plugin.constructor.name,

        visitor: {
          Program(node: AST.Program): AST.Node | void {
            if (!pluginInstantiated) {
              pluginInstantiated = true;
              let plugin = new (_plugin as LegacyPluginClass)(env);

              plugin.syntax = env.syntax;

              return plugin.transform(node);
            }
          },
        },
      };
    };

    pluginFunc.__raw = _plugin as LegacyPluginClass;
    plugin = pluginFunc;
  }

  return plugin as PluginFunc;
}

export function registerPlugin(type: string, _plugin: PluginFunc | LegacyPluginClass) {
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

export function unregisterPlugin(type: string, PluginClass: PluginFunc | LegacyPluginClass) {
  if (type !== 'ast') {
    throw new Error(
      `Attempting to unregister ${PluginClass} as "${type}" which is not a valid Glimmer plugin type.`
    );
  }

  USER_PLUGINS = USER_PLUGINS.filter(
    plugin => plugin !== PluginClass && plugin.__raw !== PluginClass
  );
}
