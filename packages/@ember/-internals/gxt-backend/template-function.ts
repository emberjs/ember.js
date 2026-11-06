// The GXT `template()` of `@ember/template-compiler`: the runtime form of
// `<template>` (`template(source, { scope })` or `{ eval }`), compiled by the
// GXT runtime compiler (compile.ts's `compileTemplate`) and set as the
// component's template. @ember/template-compiler's lib/template.ts calls it
// through the gxt-bridge (`compilePipeline.template`) in GXT builds; compile.ts
// imports this module, which installs it.
//
// `templateOnly` and `setComponentTemplate` are imported with the specifiers
// template.ts uses, so they are the same modules in every build (in GXT builds
// the `@glimmer/manager` shim's `setComponentTemplate`).
import templateOnly from '@ember/component/template-only';
import { setComponentTemplate } from '@glimmer/manager/lib/public/template';
import type {
  BaseClassTemplateOptions,
  BaseTemplateOptions,
} from '@ember/template-compiler/lib/template';
import {
  compileTemplate as gxtCompileTemplate,
  escapeBindingName,
  type AstTransform,
} from '@lifeart/gxt/runtime-compiler';
import { getGxtRenderer, installCompilePipelinePart } from './gxt-bridge';
import { gxtExplicitThisTransform, gxtTemplateLocals } from './ast-transforms';

/**
 * The scope of the implicit form, `template(source, { eval })`: every free
 * variable of the template (`gxtTemplateLocals`: a path head or a component tag
 * that no block param binds) that the caller's `eval` resolves to a value.
 * Text, attribute names and comments name no variable.
 */
function _extractScopeFromEval(
  templateString: string,
  evalFn: (v: string) => unknown
): Record<string, unknown> | undefined {
  const scope: Record<string, unknown> = {};
  for (const name of gxtTemplateLocals(parseTemplate(templateString))) {
    // A name that is not a plain JS identifier (`has-block`, `-in-element`,
    // a reserved word such as `if`) is not a variable of the caller's scope.
    if (escapeBindingName(name) !== name) continue;
    // Skip GXT/Ember built-in keywords. These are part of the template
    // language (resolved by the compiler/runtime), so the user must opt-in
    // to shadowing them via the explicit `scope` form. The implicit form
    // can accidentally pick them up via `eval()` when the surrounding
    // bundle exposes a same-named binding (e.g. an internal `let helper`
    // declared by a sibling Glimmer runtime module).
    if (_GXT_KEYWORD_NAMES.has(name)) continue;
    try {
      const value = evalFn(name);
      if (value !== undefined) {
        scope[name] = value;
      }
    } catch (error) {
      // The name is not a variable of the caller's scope (a ReferenceError),
      // or a word that cannot name one there (a SyntaxError): the free
      // variables include the template's keywords. Anything else, such as a
      // global's getter that throws, is the template's error.
      if (!(error instanceof ReferenceError) && !(error instanceof SyntaxError)) {
        throw error;
      }
    }
  }

  return Object.keys(scope).length > 0 ? scope : undefined;
}

// Strict-mode keywords reserved for the curried helper / modifier forms
// (`{{helper foo "x"}}`, `{{modifier foo "x"}}`). Direct `eval()` can resolve
// them to an unrelated same-named binding in the surrounding bundle, so the
// implicit form skips them; shadow them via the explicit
// `scope: () => ({ helper: myHelper })` form instead.
const _GXT_KEYWORD_NAMES = new Set<string>(['helper', 'modifier']);

/**
 * Parses a template with the GXT compiler's parser (`@glimmer/syntax`'s
 * `preprocess`, which `@lifeart/gxt/runtime-compiler` depends on). gxt exports
 * no parser of its own; its compiler hands that one to AST transforms as
 * `env.syntax.parse`, so it is taken from there once, from a compile of the
 * empty template. A second parser in the compat build is avoided.
 */
function parseTemplate(source: string): unknown {
  if (_gxtSyntax.parse === undefined) {
    const capture = (env: { syntax: { parse(source: string): unknown } }) => {
      _gxtSyntax.parse = env.syntax.parse;
      return { name: 'ember-gxt-parser', visitor: {} };
    };
    gxtCompileTemplate('', { transforms: [capture as unknown as AstTransform] });
  }
  if (_gxtSyntax.parse === undefined) {
    throw new Error(
      '[gxt-backend] the @lifeart/gxt compiler ran no AST transform, so its template parser (`env.syntax.parse`) is not available'
    );
  }
  return _gxtSyntax.parse(source);
}

const _gxtSyntax: { parse?: (source: string) => unknown } = {};

/** `template()` (@ember/template-compiler's lib/template.ts) in GXT builds. */
export function gxtTemplate(
  templateString: string,
  providedOptions?: BaseTemplateOptions | BaseClassTemplateOptions<any>
): object {
  const gxtCompile = getGxtRenderer()?.compilePipeline.compileTemplate;
  if (gxtCompile) {
    const gxtOptions = { strictMode: true, ...providedOptions };
    const gxtComponent = (gxtOptions as any).component ?? templateOnly();

    // Extract scope values from explicit scope() or implicit eval()
    let scopeValues: Record<string, unknown> | undefined;
    // Track whether `this` was bound by the *explicit* form. The implicit
    // `eval()` form can also accidentally resolve `this` to the eval method's
    // outer `this`, but in that case the user did NOT intend to override the
    // template's rendering context — so we must not rewrite `{{this.X}}` for
    // implicit-form templates.
    let explicitlyProvidedThis = false;

    if ('scope' in gxtOptions && typeof (gxtOptions as any).scope === 'function') {
      // Explicit form: scope: () => ({ Foo, bar })
      scopeValues = ((gxtOptions as any).scope as () => Record<string, unknown>)();
      if (
        scopeValues &&
        Object.prototype.hasOwnProperty.call(scopeValues, 'this') &&
        scopeValues['this'] !== undefined
      ) {
        explicitlyProvidedThis = true;
      }
    } else if ('eval' in gxtOptions && typeof (gxtOptions as any).eval === 'function') {
      // Implicit form: eval() { return eval(arguments[0]) }
      // Extract free variable names from the template and resolve them via eval
      scopeValues = _extractScopeFromEval(
        templateString,
        (gxtOptions as any).eval as (v: string) => unknown
      );
      // Defensive: even if `_extractScopeFromEval` somehow returns `this`,
      // strip it. The implicit form must never override the rendering
      // context — see the explicit-form branch above for the intended way
      // to shadow `this`.
      if (scopeValues && Object.prototype.hasOwnProperty.call(scopeValues, 'this')) {
        delete (scopeValues as Record<string, unknown>)['this'];
      }
    }

    // Strict-mode `this` shadowing: when the user explicitly provides `this`
    // via `scope: () => ({ this: state })`, the GXT compiler would otherwise
    // emit a literal `this.X` reference for `{{this.X}}` — which picks up
    // the rendering context, not the user's value. The template's `this`
    // path heads read a non-`this` alias instead (`gxtExplicitThisTransform`,
    // an AST plugin), which the scope binds to the user's value, so the GXT
    // compiler emits a normal binding-path lookup.
    let plugins: { ast: AstTransform[] } | undefined;
    if (explicitlyProvidedThis && scopeValues) {
      const explicitThisAlias = '__gxtExplicitThis';
      // Avoid clobbering an existing alias — extremely unlikely, but guard
      // against pathological user-supplied scopes.
      if (!Object.prototype.hasOwnProperty.call(scopeValues, explicitThisAlias)) {
        plugins = { ast: [gxtExplicitThisTransform(explicitThisAlias)] };
        scopeValues = { ...scopeValues, [explicitThisAlias]: scopeValues['this'] };
        delete (scopeValues as Record<string, unknown>)['this'];
      }
    }

    const gxtTemplate = gxtCompile(templateString, {
      moduleName: (gxtOptions as any).moduleName,
      // Strict by default; `strictMode: false` compiles a loose template, as
      // the Glimmer path below does.
      strictMode: gxtOptions.strictMode,
      scopeValues,
      plugins,
    });

    setComponentTemplate(gxtTemplate as Parameters<typeof setComponentTemplate>[0], gxtComponent);
    return gxtComponent;
  }
  throw new Error(
    'template(): the GXT template compile pipeline is not installed (@ember/-internals/gxt-backend/compile.ts has not loaded)'
  );
}

installCompilePipelinePart({ template: gxtTemplate });
