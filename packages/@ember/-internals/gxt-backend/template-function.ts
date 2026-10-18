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
import { getGxtRenderer, installCompilePipelinePart } from './gxt-bridge';

/**
 * Extract scope values from a template string using an eval function.
 * Used in GXT mode to resolve the implicit form's local variables.
 */
function _extractScopeFromEval(
  templateString: string,
  evalFn: (v: string) => unknown
): Record<string, unknown> {
  const scope: Record<string, unknown> = {};

  // Extract potential free variable names from the template:
  // 1. Component invocations: <Foo />, <Foo>, </Foo>
  // 2. Mustache expressions: {{foo}}, {{foo bar}}, (foo ...)
  // 3. Helper/modifier invocations: {{on "click" ...}}, (fn ...)
  // 4. Dotted paths: <state.component /> (head part only)
  const identifiers = new Set<string>();

  // Match PascalCase component names: <Foo, <FooBar
  const componentPattern = /<([A-Z][a-zA-Z0-9]*)\b/g;
  let m;
  while ((m = componentPattern.exec(templateString)) !== null) {
    identifiers.add(m[1]!);
  }

  // Match lowercase identifiers in mustache/subexpression position
  // {{foo}}, {{foo bar}}, (foo ...), {{#foo}}, {{/foo}}
  // Note: do NOT skip keywords — they can be shadowed in strict mode
  const mustachePattern = /\{\{#?\/?([a-z][a-zA-Z0-9_]*)\b/g;
  while ((m = mustachePattern.exec(templateString)) !== null) {
    identifiers.add(m[1]!);
  }

  // Match subexpression helpers: (foo ...) but not (this.foo)
  const subexprPattern = /\(([a-z][a-zA-Z0-9_]*)\b/g;
  while ((m = subexprPattern.exec(templateString)) !== null) {
    identifiers.add(m[1]!);
  }

  // Match dotted path heads: <state.component /> → state
  const dottedPattern = /<([a-z][a-zA-Z0-9]*)\.([a-zA-Z])/g;
  while ((m = dottedPattern.exec(templateString)) !== null) {
    const head = m[1]!;
    if (head !== 'this') {
      identifiers.add(head);
    }
  }

  // Match dotted-path heads inside mustache/subexpression positions:
  //   {{JSON.stringify ...}}        → JSON
  //   {{state.value}}               → state (already covered by mustachePattern
  //                                   if lowercase, but uppercase needs this)
  //   (JSON.parse ...)              → JSON
  // The head must be followed by a `.` and at least one identifier character.
  // Both upper- and lower-case heads are captured; the existing keyword filter
  // (`_GXT_KEYWORD_NAMES`) still applies in the resolution loop below.
  const dottedExprPattern = /[{(]\s*[#/!]?\s*([a-zA-Z][a-zA-Z0-9_]*)\.([a-zA-Z])/g;
  while ((m = dottedExprPattern.exec(templateString)) !== null) {
    const head = m[1]!;
    if (head !== 'this') {
      identifiers.add(head);
    }
  }

  // Match modifier names: <div {{foo}}>
  const modifierPattern = /\{\{([a-z][a-zA-Z0-9_]*)\b/g;
  while ((m = modifierPattern.exec(templateString)) !== null) {
    identifiers.add(m[1]!);
  }

  // Catch-all: match any bare identifier that appears in expression context
  // This catches variables used as arguments in subexpressions like (modifier foo ...)
  // and {{helper foo ...}} etc.
  //
  // The `_HBS_SYNTAX_WORDS` filter excludes identifiers that collide with HTML
  // tag names (e.g. `a`, `p`, `li`) BUT only when they appear in actual HTML
  // element-name position (right after `<` or `</`). Inside `{{...}}` or
  // `(...)` mustaches/subexpressions, the same identifier IS a real variable
  // reference and must be resolved via eval (e.g. `a` in
  // `{{if (and a b) "yes" "no"}}`).
  const bareIdentPattern = /\b([a-z][a-zA-Z0-9_]*)\b/g;
  while ((m = bareIdentPattern.exec(templateString)) !== null) {
    const name = m[1]!;
    const matchIdx = m.index;
    // Determine context by scanning leftward past whitespace + identifier
    // characters to find the nearest meaningful preceding character. If it is
    // `<` or `</`, this is an HTML element-name and should be filtered against
    // `_HBS_SYNTAX_WORDS`. Otherwise (mustache/subexpression position) the
    // identifier is treated as a variable reference.
    let isHtmlTagPos = false;
    if (_HBS_SYNTAX_WORDS.has(name)) {
      let k = matchIdx - 1;
      while (k >= 0 && (templateString[k] === ' ' || templateString[k] === '\t')) k--;
      if (
        templateString[k] === '<' ||
        (templateString[k] === '/' && templateString[k - 1] === '<')
      ) {
        isHtmlTagPos = true;
      }
    }
    if (!isHtmlTagPos) {
      identifiers.add(name);
    }
  }

  // Try to resolve each identifier via eval
  for (const name of identifiers) {
    // Skip GXT/Ember built-in keywords. These are part of the template
    // language (resolved by the compiler/runtime), so the user must opt-in
    // to shadowing them via the explicit `scope` form. The implicit form
    // can accidentally pick them up via `eval()` when the surrounding
    // bundle exposes a same-named binding (e.g. an internal `let helper`
    // declared by a sibling Glimmer runtime module).
    if (_GXT_KEYWORD_NAMES.has(name)) {
      continue;
    }
    // JS literal keywords are NOT free variables — `{{if true "a" "b"}}`
    // must not produce a scope entry `{ true: true }` (direct `eval('true')`
    // happily returns the literal), which downstream becomes an invalid
    // Function parameter name (`new Function('true', …)` → SyntaxError).
    if (_JS_LITERAL_NAMES.has(name)) {
      continue;
    }
    try {
      const value = evalFn(name);
      if (value !== undefined) {
        scope[name] = value;
      }
    } catch (error) {
      // The word is not a variable of the caller's scope (a ReferenceError),
      // or a reserved word such as `if` or `else` (a SyntaxError): the scan
      // also collects template keywords and text. Anything else, such as a
      // global's getter that throws, is the template's error.
      if (!(error instanceof ReferenceError) && !(error instanceof SyntaxError)) {
        throw error;
      }
    }
  }

  return Object.keys(scope).length > 0 ? scope : (undefined as any);
}

// JS literal keywords the free-variable extraction must never treat as scope
// names (direct `eval('true')` returns the literal, so the try/catch filter
// alone does not exclude them).
const _JS_LITERAL_NAMES = new Set<string>(['true', 'false', 'null', 'undefined', 'this']);

// Strict-mode keywords reserved for the curried helper / modifier forms
// (`{{helper foo "x"}}`, `{{modifier foo "x"}}`). Direct `eval()` can resolve
// them to an unrelated same-named binding in the surrounding bundle, so the
// implicit form skips them; shadow them via the explicit
// `scope: () => ({ helper: myHelper })` form instead.
const _GXT_KEYWORD_NAMES = new Set<string>(['helper', 'modifier']);

// HBS syntax words that should not be treated as variable references
const _HBS_SYNTAX_WORDS = new Set([
  'as',
  'div',
  'span',
  'button',
  'input',
  'textarea',
  'form',
  'a',
  'p',
  'ul',
  'li',
  'ol',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'table',
  'tr',
  'td',
  'th',
  'thead',
  'tbody',
  'img',
  'br',
  'hr',
  'nav',
  'section',
  'article',
  'header',
  'footer',
  'main',
  'aside',
  'label',
  'select',
  'option',
  'pre',
  'code',
  'em',
  'strong',
  'class',
  'id',
  'type',
  'name',
  'value',
  'checked',
  'disabled',
  'href',
  'src',
  'click',
  'true',
  'false',
  'null',
  'undefined',
  'this',
]);

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
    // the rendering context, not the user's value. Rewrite the path head to
    // a non-`this` alias and rebind it in scopeValues so the GXT compiler
    // emits a normal binding-path lookup.
    let processedTemplate = templateString;
    if (explicitlyProvidedThis && scopeValues) {
      const explicitThisAlias = '__gxtExplicitThis';
      // Avoid clobbering an existing alias — extremely unlikely, but guard
      // against pathological user-supplied scopes.
      if (!Object.prototype.hasOwnProperty.call(scopeValues, explicitThisAlias)) {
        // Replace path heads in the template:
        //   {{this.X}}     → {{__gxtExplicitThis.X}}
        //   {{this}}       → {{__gxtExplicitThis}}      (rare but safe)
        //   (this.X        → (__gxtExplicitThis.X
        //   <this.X        → <__gxtExplicitThis.X
        // The substitution is purely textual but only inside expression
        // positions: a leading `{{`, `(`, or `<` must precede the `this`.
        processedTemplate = processedTemplate.replace(
          /(\{\{[#/!]?\s*|\(\s*|<\s*)this\b/g,
          (_full, prefix: string) => `${prefix}${explicitThisAlias}`
        );
        scopeValues = { ...scopeValues, [explicitThisAlias]: scopeValues['this'] };
        delete (scopeValues as Record<string, unknown>)['this'];
      }
    }

    const gxtTemplate = gxtCompile(processedTemplate, {
      moduleName: (gxtOptions as any).moduleName,
      // Strict by default; `strictMode: false` compiles a loose template, as
      // the Glimmer path below does.
      strictMode: gxtOptions.strictMode,
      scopeValues,
    });

    setComponentTemplate(gxtTemplate as Parameters<typeof setComponentTemplate>[0], gxtComponent);
    return gxtComponent;
  }
  throw new Error(
    'template(): the GXT template compile pipeline is not installed (@ember/-internals/gxt-backend/compile.ts has not loaded)'
  );
}

installCompilePipelinePart({ template: gxtTemplate });
