import { and } from '@glimmer/runtime/lib/helpers/and';
import { array } from '@glimmer/runtime/lib/helpers/array';
import { concat } from '@glimmer/runtime/lib/helpers/concat';
import { get } from '@glimmer/runtime/lib/helpers/get';
import { default as uniqueId } from '@ember/-internals/glimmer/lib/helpers/unique-id';
import { default as resolve } from '@ember/-internals/glimmer/lib/helpers/-resolve';
import { default as disallowDynamicResolution } from '@ember/-internals/glimmer/lib/helpers/-disallow-dynamic-resolution';
import element from '@ember/-internals/glimmer/lib/helpers/element';
import { eq } from '@glimmer/runtime/lib/helpers/eq';
import { fn } from '@glimmer/runtime/lib/helpers/fn';
import { hash } from '@glimmer/runtime/lib/helpers/hash';
import { neq } from '@glimmer/runtime/lib/helpers/neq';
import { not } from '@glimmer/runtime/lib/helpers/not';
import { lt } from '@glimmer/runtime/lib/helpers/lt';
import { lte } from '@glimmer/runtime/lib/helpers/lte';
import { gt } from '@glimmer/runtime/lib/helpers/gt';
import { gte } from '@glimmer/runtime/lib/helpers/gte';
import { or } from '@glimmer/runtime/lib/helpers/or';
import { on } from '@ember/modifier/on';
import eachIn from '@ember/-internals/glimmer/lib/helpers/each-in';
import inElementNullCheck from '@ember/-internals/glimmer/lib/helpers/-in-element-null-check';
import { mountHelper as mount } from '@ember/-internals/glimmer/lib/syntax/mount';
import mut from '@ember/-internals/glimmer/lib/helpers/mut';
import { outletHelper as outlet } from '@ember/-internals/glimmer/lib/syntax/outlet';
import readonly from '@ember/-internals/glimmer/lib/helpers/readonly';
import trackArray from '@ember/-internals/glimmer/lib/helpers/-track-array';
import unbound from '@ember/-internals/glimmer/lib/helpers/unbound';
import { assert } from '@ember/debug';
import { RESOLUTION_MODE_TRANSFORMS, STRICT_MODE_TRANSFORMS } from './plugins/index';
import { ALLOWED_GLOBALS } from './plugins/allowed-globals';
import type { EmberPrecompileOptions, PluginFunc } from './types';
import COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE from './dasherize-component-name';

let USER_PLUGINS: PluginFunc[] = [];

function malformedComponentLookup(string: string) {
  return string.indexOf('::') === -1 && string.indexOf(':') > -1;
}

export const keywords: Record<string, unknown> = {
  resolve,
  disallowDynamicResolution,
  array,
  eq,
  element,
  and,
  fn,
  hash,
  neq,
  gt,
  gte,
  lt,
  lte,
  not,
  on,
  or,
  concat,
  get,
  uniqueId,
  mut,
  readonly,
  unbound,
  eachIn,
  inElementNullCheck,
  trackArray,
  outlet,
  mount,
};

/**
 * The compilers bind a keyword to a bare local name, which loose and
 * strict templates can both invoke. The evaluators supply these names.
 */
export const RUNTIME_KEYWORD_LOCALS: Record<string, unknown> = {};

for (let [name, value] of Object.entries(keywords)) {
  RUNTIME_KEYWORD_LOCALS[`__ember_kw_${name}`] = value;
}

export function lookupRuntimeKeyword(name: string): string {
  assert(
    `${name} is not a known keyword. Available keywords: ${Object.keys(keywords).join(', ')}`,
    name in keywords
  );

  return `__ember_kw_${name}`;
}

function buildCompileOptions(_options: EmberPrecompileOptions): EmberPrecompileOptions {
  let moduleName = _options.moduleName;

  let options = {
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

  options.meta ||= {};
  options.meta.emberRuntime ||= {
    lookupKeyword: lookupRuntimeKeyword,
  };

  if ('eval' in options && options.eval) {
    const localScopeEvaluator = options.eval;
    const globalScopeEvaluator = (value: string) => new Function(`return ${value};`)();

    options.lexicalScope = (variable: string) => {
      // The evaluator in template.ts supplies every bound keyword local.
      if (variable in RUNTIME_KEYWORD_LOCALS) {
        return true;
      }

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

    options.lexicalScope = (variable: string) =>
      variable in scope || variable in RUNTIME_KEYWORD_LOCALS;

    delete options.scope;
  }

  // When neither eval nor scope is provided, the keywords container
  // still needs to be visible to the compiler.
  if (!options.lexicalScope) {
    options.lexicalScope = (variable: string) => variable in RUNTIME_KEYWORD_LOCALS;
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
