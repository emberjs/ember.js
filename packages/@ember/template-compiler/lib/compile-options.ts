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
    const localScopeEvaluator = options.eval as (value: string) => unknown;
    const globalScopeEvaluator = (value: string) => new Function(`return ${value};`)();

    options.lexicalScope = (variable: string) => {
      if (ALLOWED_GLOBALS.has(variable)) {
        return variable in globalThis;
      }

      if (inScope(variable, localScopeEvaluator)) {
        return !inScope(variable, globalScopeEvaluator);
      }

      return false;
    };

    delete options.eval;
  }

  if ('scope' in options) {
    const scope = (options.scope as () => Record<string, unknown>)();

    options.lexicalScope = (variable: string) => {
      if (ALLOWED_GLOBALS.has(variable)) {
        return variable in globalThis;
      }

      return variable in scope;
    };

    delete options.scope;
  }

  if ('locals' in options && !options.locals) {
    // Glimmer's precompile options declare `locals` like:
    //    locals?: string[]
    // but many in-use versions of babel-plugin-htmlbars-inline-precompile will
    // set locals to `null`. This used to work but only because glimmer was
    // ignoring locals for non-strict templates, and now it supports that case.
    delete options.locals;
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

type Evaluator = (value: string) => unknown;

// https://tc39.es/ecma262/2020/#prod-IdentifierName
const IDENT = /^[\p{ID_Start}$_][\p{ID_Continue}$_\u200C\u200D]*$/u;

function inScope(variable: string, evaluator: Evaluator): boolean {
  // If the identifier is not a valid JS identifier, it's definitely not in scope
  if (!IDENT.exec(variable)) {
    return false;
  }

  try {
    return evaluator(`typeof ${variable} !== "undefined"`) === true;
  } catch (e) {
    // This occurs when attempting to evaluate a reserved word using eval (`eval('typeof let')`).
    // If the variable is a reserved word, it's definitely not in scope, so return false. Since
    // reserved words are somewhat contextual, we don't try to identify them purely by their
    // name. See https://tc39.es/ecma262/#sec-keywords-and-reserved-words
    if (e && e instanceof SyntaxError) {
      return false;
    }

    // If it's another kind of error, don't swallow it.
    throw e;
  }
}
