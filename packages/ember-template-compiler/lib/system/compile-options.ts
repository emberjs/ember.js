import { EMBER_STRICT_MODE } from '@ember/canary-features';
import { assert } from '@ember/debug';
import { assign } from '@ember/polyfills';
import { PrecompileOptions } from '@glimmer/compiler';
import { AST, ASTPlugin, ASTPluginEnvironment, Syntax } from '@glimmer/syntax';
import { RESOLUTION_MODE_TRANSFORMS, STRICT_MODE_TRANSFORMS } from '../plugins/index';
import { EmberPrecompileOptions, PluginFunc } from '../types';
import COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE from './dasherize-component-name';

let USER_PLUGINS: PluginFunc[] = [];

function malformedComponentLookup(string: string) {
  return string.indexOf('::') === -1 && string.indexOf(':') > -1;
}

export default function compileOptions(
  _options: Partial<EmberPrecompileOptions> = {}
): PrecompileOptions {
  let options: EmberPrecompileOptions = assign(
    { meta: {}, isProduction: false, plugins: { ast: [] } },
    _options,
    {
      customizeComponentName(tagname: string): string {
        assert(
          `You tried to invoke a component named <${tagname} /> in "${_options.moduleName}", but that is not a valid name for a component. Did you mean to use the "::" syntax for nested components?`,
          !malformedComponentLookup(tagname)
        );

        return COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get(tagname);
      },
    }
  );

  if (!EMBER_STRICT_MODE) {
    options.strictMode = false;
    options.locals = undefined;
  }

  // move `moduleName` into `meta` property
  if (options.moduleName) {
    let meta = options.meta;
    meta.moduleName = options.moduleName;
  }

  let builtInPlugins = options.strictMode ? STRICT_MODE_TRANSFORMS : RESOLUTION_MODE_TRANSFORMS;

  if (!_options.plugins) {
    options.plugins = { ast: [...USER_PLUGINS, ...builtInPlugins] };
  } else {
    let potententialPugins = [...USER_PLUGINS, ...builtInPlugins];
    let providedPlugins = options.plugins.ast.map((plugin) => wrapLegacyPluginIfNeeded(plugin));
    let pluginsToAdd = potententialPugins.filter((plugin) => {
      return options.plugins.ast.indexOf(plugin) === -1;
    });
    options.plugins.ast = providedPlugins.concat(pluginsToAdd);
  }

  // TODO: Fix the types here so that this conversion isn't necessary
  return (options as unknown) as PrecompileOptions;
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

export function registerPlugin(type: string, _plugin: PluginFunc | LegacyPluginClass): void {
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

export function unregisterPlugin(type: string, PluginClass: PluginFunc | LegacyPluginClass): void {
  if (type !== 'ast') {
    throw new Error(
      `Attempting to unregister ${PluginClass} as "${type}" which is not a valid Glimmer plugin type.`
    );
  }

  USER_PLUGINS = USER_PLUGINS.filter(
    (plugin) => plugin !== PluginClass && plugin.__raw !== PluginClass
  );
}
