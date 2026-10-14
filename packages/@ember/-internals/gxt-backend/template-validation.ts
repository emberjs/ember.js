/**
 * Glimmer's compile-time template validation for the GXT compile pipeline.
 *
 * Classic Ember compiles a template with `precompileJSON` (@glimmer/compiler)
 * under Ember's `compileOptions`: `@glimmer/syntax`'s parser runs Ember's AST
 * plugins, then ASTv2 `normalize` and the compiler's normalization pass check
 * the template. Every syntax error, keyword misuse, named-block rule and
 * strict-mode unknown reference is a `SyntaxError` (or an Ember assertion
 * from a plugin) thrown by those passes. The GXT compiler parses the template
 * itself and runs none of them.
 *
 * `validateTemplate` runs those same upstream passes, with the options
 * `compileOptions` would build, on the template source exactly as the caller
 * gave it, and lets their error propagate. It discards their output: GXT
 * compiles the template afterwards.
 *
 * It runs in development builds only (`DEBUG`), like Ember's template
 * assertions: production builds keep `@glimmer/syntax` and `@glimmer/compiler`
 * out of the runtime bundle.
 */
import { assert } from '@ember/debug';
import type { ASTPluginBuilder } from '@glimmer/syntax/lib/parser/tokenizer-event-handlers';
import { Source } from '@glimmer/syntax/lib/source/source';
import { normalize } from '@glimmer/syntax/lib/v2/normalize';
import normalizeToMir from '@glimmer/compiler/lib/passes/1-normalization/index';
import {
  RESOLUTION_MODE_TRANSFORMS,
  STRICT_MODE_KEYWORDS,
  STRICT_MODE_TRANSFORMS,
} from '@ember/template-compiler/lib/plugins/index';
import COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE from '@ember/template-compiler/lib/dasherize-component-name';

export interface TemplateValidationOptions {
  strictMode?: boolean | undefined;
  moduleName?: string | undefined;
  meta?: { moduleName?: string | undefined } | undefined;
  /** Ember's `locals`: the names a strict-mode template's scope provides. */
  locals?: readonly string[] | undefined;
  /** The names of the template's lexical scope (`scope()` / scope values). */
  scopeNames?: Iterable<string> | undefined;
  /** Further lexical scope, as a predicate (Ember's `lexicalScope`). */
  lexicalScope?: ((name: string) => boolean) | undefined;
  /** Ember's `plugins.ast`: AST plugins, run before Ember's built-in ones. */
  plugins?: { ast?: readonly unknown[] | undefined } | undefined;
}

// The variable through which `compileOptions` lets a runtime-compiled template
// reach the auto-imported built-ins (`on`, `fn`, `hash`, ...): its
// `meta.emberRuntime.lookupKeyword` rewrites `on` to `<name>.on`, and its
// `lexicalScope` reports `<name>` as in scope. Only the name's presence in
// scope matters to validation.
const RUNTIME_KEYWORDS_NAME = '__ember_keywords__';

function malformedComponentLookup(name: string): boolean {
  return name.indexOf('::') === -1 && name.indexOf(':') > -1;
}

/**
 * Throws the error `precompileJSON` throws for this template under Ember's
 * `compileOptions`, if any.
 */
export function validateTemplate(source: string, options: TemplateValidationOptions = {}): void {
  const strictMode = options.strictMode === true;
  // `compileOptions` moves `moduleName` into `meta.moduleName`; that is the
  // module name of the parser's `Source`, and of every error location.
  const moduleName = options.moduleName || options.meta?.moduleName;
  const scopeNames = new Set(options.scopeNames ?? []);

  // Ember's `compileOptions` (@ember/template-compiler/lib/compile-options.ts)
  // for a runtime compile: the caller's AST plugins, then the built-in plugins
  // of the mode; the strict-mode keywords; the component-name hook; the
  // runtime keyword lookup and the lexical scope.
  const builtInPlugins = strictMode ? STRICT_MODE_TRANSFORMS : RESOLUTION_MODE_TRANSFORMS;
  const userPlugins = (options.plugins?.ast ?? []) as readonly ASTPluginBuilder[];
  const plugins = [
    ...userPlugins,
    ...(builtInPlugins as readonly ASTPluginBuilder[]).filter(
      (plugin) => userPlugins.indexOf(plugin) === -1
    ),
  ];

  const precompileOptions = {
    isProduction: false,
    strictMode,
    meta: {
      moduleName,
      emberRuntime: {
        lookupKeyword: (name: string) => `${RUNTIME_KEYWORDS_NAME}.${name}`,
      },
    },
    plugins: { ast: plugins },
    ...(strictMode ? { keywords: [...STRICT_MODE_KEYWORDS] } : {}),
    ...(options.locals ? { locals: [...options.locals] } : {}),
    lexicalScope: (variable: string) =>
      variable === RUNTIME_KEYWORDS_NAME ||
      scopeNames.has(variable) ||
      options.lexicalScope?.(variable) === true,
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

  // The checking half of `precompileJSON` (@glimmer/compiler/lib/compiler.ts):
  // parse + plugins + ASTv2 normalization, then the normalization pass that
  // validates keywords and strict-mode references.
  const templateSource = new Source(source, moduleName);
  const [ast] = normalize(templateSource, precompileOptions);
  const result = normalizeToMir(templateSource, ast, strictMode);

  if (result.isErr) {
    throw result.reason;
  }
}
