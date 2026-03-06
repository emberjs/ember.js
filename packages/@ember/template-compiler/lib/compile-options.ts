import { assert } from '@ember/debug';
import {
  RESOLUTION_MODE_TRANSFORMS,
  STRICT_MODE_KEYWORDS,
  STRICT_MODE_TRANSFORMS,
} from './plugins/index';
import { ALLOWED_GLOBALS } from './plugins/allowed-globals';
import type { EmberPrecompileOptions, PluginFunc } from './types';
import COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE from './dasherize-component-name';

let USER_PLUGINS: PluginFunc[] = [];

function malformedComponentLookup(string: string) {
  return string.indexOf('::') === -1 && string.indexOf(':') > -1;
}

function buildCompileOptions(_options: EmberPrecompileOptions): EmberPrecompileOptions {
  let moduleName = _options.moduleName;

  let options: EmberPrecompileOptions & Partial<EmberPrecompileOptions> = {
    meta: {},
    isProduction: false,
    plugins: { ast: [] },
    ..._options,
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
  };

  if ('eval' in options) {
    const evalFn = options.eval as (value: string) => unknown;
    const globalEval = (value: string) => new Function(`return ${value};`)();

    options.scope = new Proxy({} as Record<string, unknown>, {
      has(_, name) {
        if (typeof name !== 'string' || !IDENT.test(name)) return false;
        if (ALLOWED_GLOBALS.has(name)) return name in globalThis;
        return inScope(name, evalFn) && !inScope(name, globalEval);
      },
    });

    delete options.eval;
  }

  if ('scope' in options && typeof options.scope === 'function') {
    options.scope = (options.scope as () => Record<string, unknown>)();
  }

  // move `moduleName` into `meta` property
  if (options.moduleName) {
    let meta = options.meta;
    assert('has meta', meta); // We just set it
    meta.moduleName = options.moduleName;
  }

  if (options.strictMode) {
    options.keywords = STRICT_MODE_KEYWORDS;
  }

  return options;
}

function transformsFor(options: EmberPrecompileOptions): readonly PluginFunc[] {
  return options.strictMode ? STRICT_MODE_TRANSFORMS : RESOLUTION_MODE_TRANSFORMS;
}

// https://tc39.es/ecma262/2020/#prod-IdentifierName
const IDENT = /^[\p{ID_Start}$_][\p{ID_Continue}$_\u200C\u200D]*$/u;

function inScope(variable: string, evaluator: (value: string) => unknown): boolean {
  try {
    return evaluator(`typeof ${variable} !== "undefined"`) === true;
  } catch (e) {
    if (e instanceof SyntaxError) return false;
    throw e;
  }
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
    let pluginsToAdd = potententialPugins.filter((plugin) => {
      assert('expected plugins', options.plugins);
      return options.plugins.ast.indexOf(plugin) === -1;
    });
    options.plugins.ast = [...options.plugins.ast, ...pluginsToAdd];
  }

  return options;
}
