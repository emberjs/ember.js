import { EMBER_STRICT_MODE } from '@ember/canary-features';
import { assert, deprecate } from '@ember/debug';
import { AST, ASTPlugin, ASTPluginEnvironment, Syntax } from '@glimmer/syntax';
import { RESOLUTION_MODE_TRANSFORMS, STRICT_MODE_TRANSFORMS } from '../plugins/index';
import { EmberPrecompileOptions, PluginFunc } from '../types';
import COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE from './dasherize-component-name';

let USER_PLUGINS: PluginFunc[] = [];

function malformedComponentLookup(string: string) {
  return string.indexOf('::') === -1 && string.indexOf(':') > -1;
}

export function buildCompileOptions(_options: EmberPrecompileOptions): EmberPrecompileOptions {
  let moduleName = _options.moduleName;
  let options: EmberPrecompileOptions = Object.assign(
    { meta: {}, isProduction: false, plugins: { ast: [] } },
    _options,
    {
      moduleName,
      customizeComponentName(tagname: string): string {
        assert(
          `You tried to invoke a component named <${tagname} /> in "${
            moduleName ?? '[NO MODULE]'
          }", but that is not a valid name for a component. Did you mean to use the "::" syntax for nested components?`,
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
    assert('has meta', meta); // We just set it
    meta.moduleName = options.moduleName;
  }

  return options;
}

export function transformsFor(options: EmberPrecompileOptions): readonly PluginFunc[] {
  return EMBER_STRICT_MODE && options.strictMode
    ? STRICT_MODE_TRANSFORMS
    : RESOLUTION_MODE_TRANSFORMS;
}

export default function compileOptions(
  _options: Partial<EmberPrecompileOptions> = {}
): EmberPrecompileOptions {
  let options = buildCompileOptions(_options);
  let builtInPlugins = transformsFor(options);

  if (!_options.plugins) {
    options.plugins = { ast: [...USER_PLUGINS, ...builtInPlugins] };
  } else {
    let potententialPugins = [...USER_PLUGINS, ...builtInPlugins];
    assert('expected plugins', options.plugins);
    let providedPlugins = options.plugins.ast.map((plugin) => wrapLegacyPluginIfNeeded(plugin));
    let pluginsToAdd = potententialPugins.filter((plugin) => {
      assert('expected plugins', options.plugins);
      return options.plugins.ast.indexOf(plugin) === -1;
    });
    options.plugins.ast = providedPlugins.concat(pluginsToAdd);
  }

  return options;
}

interface LegacyPlugin {
  transform(node: AST.Program): AST.Node;
  syntax: Syntax;
}

export type LegacyPluginClass = new (env: ASTPluginEnvironment) => LegacyPlugin;

function isLegacyPluginClass(plugin: PluginFunc | LegacyPluginClass): plugin is LegacyPluginClass {
  return plugin.prototype && typeof plugin.prototype.transform === 'function';
}

function wrapLegacyPluginIfNeeded(plugin: PluginFunc | LegacyPluginClass): PluginFunc {
  if (isLegacyPluginClass(plugin)) {
    const Plugin = plugin;

    deprecate(
      `Using class based template compilation plugins is deprecated, please update to the functional style: ${Plugin.name}`,
      false,
      {
        id: 'template-compiler.registerPlugin',
        until: '4.0.0',
        for: 'ember-source',
        since: {
          enabled: '3.27.0',
        },
      }
    );

    const pluginFunc: PluginFunc = (env: ASTPluginEnvironment): ASTPlugin => {
      let pluginInstantiated = false;

      return {
        name: plugin.name,

        visitor: {
          Program(node: AST.Program): AST.Node | void {
            if (!pluginInstantiated) {
              pluginInstantiated = true;
              let instance = new Plugin(env);

              instance.syntax = env.syntax;

              return instance.transform(node);
            }
          },
        },
      };
    };

    pluginFunc.__raw = Plugin;

    return pluginFunc;
  } else {
    return plugin;
  }
}

export function registerPlugin(type: string, _plugin: PluginFunc | LegacyPluginClass): void {
  deprecate(
    'registerPlugin is deprecated, please pass plugins directly via `compile` and/or `precompile`.',
    false,
    {
      id: 'template-compiler.registerPlugin',
      until: '4.0.0',
      for: 'ember-source',
      since: {
        enabled: '3.27.0',
      },
    }
  );

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
  deprecate(
    'unregisterPlugin is deprecated, please pass plugins directly via `compile` and/or `precompile`.',
    false,
    {
      id: 'template-compiler.registerPlugin',
      until: '4.0.0',
      for: 'ember-source',
      since: {
        enabled: '3.27.0',
      },
    }
  );

  if (type !== 'ast') {
    throw new Error(
      `Attempting to unregister ${PluginClass} as "${type}" which is not a valid Glimmer plugin type.`
    );
  }

  USER_PLUGINS = USER_PLUGINS.filter(
    (plugin) => plugin !== PluginClass && plugin.__raw !== PluginClass
  );
}
