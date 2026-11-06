// gxt NATIVE layer — the RUNTIME template compiler. Alias target for
//   - `internal-test-helpers/lib/compile`  (default export `compile(source,
//     options, scopeValues)` → a TemplateFactory: RenderingTestCase /
//     ApplicationTestCase templates), and
//   - `@ember/template-compiler/runtime`    (`template(source, options)`: the
//     public runtime `<template>` compiler, strict mode by default).
//
// It compiles with the gxt runtime compiler under the SAME `NATIVE_FLAGS`
// object the AOT vite plugin uses (scripts/gxt-alias-map.mjs, so the two cannot
// drift) through gxt `compileTemplateSource`, which shares the AOT assembler's
// template-function wrapper: a template compiled here is the exact function the
// AOT build would emit for it. The source is evaluated with every free gxt
// runtime identifier bound to the export of the same name from `@lifeart/gxt` —
// the AOT import source — so nothing is installed on globalThis (no
// `setupGlobalScope`, no Map/Set patching).
//
// NEVER part of an app closure: it pulls the gxt compiler + @glimmer/syntax.
// Only tests and explicit runtime compilation import it (`--assert-native`
// forbids the compiler chunks in the modern app).
//
// Template shapes:
//   - strict (`strictMode: true`, the runtime `template()` default): a
//     `$_tpl`-branded template-only component function, exactly like an AOT
//     `.gjs` `<template>`; `this` = the component (self === node);
//   - loose (`strictMode: false`, the test-helper `compile()` default): the same
//     function, marked LOOSE (template-factory.ts): a host renders it with a
//     self (`selfComponent`) — the test context, a route's controller.
import { DEBUG } from '@glimmer/env';
import * as gxtRuntime from '@lifeart/gxt';
import { $SELF, $_tpl } from '@lifeart/gxt';
import { compileTemplateSource, type TemplateSource } from '@lifeart/gxt/runtime-compiler';
// The ONE flag constant shared with the AOT vite plugin (vite.config.mjs).
import { NATIVE_DEBUG_FLAGS, NATIVE_FLAGS } from '../../../../../scripts/gxt-alias-map.mjs';
import { setComponentTemplate } from './manager-api';
import {
  factoryForTemplate,
  markLooseTemplate,
  type GxtTemplate,
  type NativeTemplateFactory,
} from './template-factory';
import { templateOnlyComponent } from './template-only';

export { NATIVE_FLAGS };
// `@ember/template-compiler`'s RFC 1070 allowed-globals list (pure data; test
// modules iterate it).
export { ALLOWED_GLOBALS } from '@ember/template-compiler/lib/plugins/allowed-globals';

interface CompileOptions {
  strictMode?: boolean;
  moduleName?: string;
  meta?: { moduleName?: string };
  locals?: string[];
  [key: string]: unknown;
}

type Evaluator = (
  source: string,
  names: readonly string[],
  values: readonly unknown[]
) => GxtTemplate;

// Every gxt runtime identifier a template may reference → its `@lifeart/gxt`
// export. A missing export is a seam bug (the compiler emits a symbol the main
// entry does not provide): fail loudly, never bind `undefined`.
const RUNTIME = gxtRuntime as unknown as Record<string, unknown>;
const runtimeValuesCache = new Map<string, readonly unknown[]>();

function runtimeValues(names: readonly string[]): readonly unknown[] {
  const key = names.join(',');
  let values = runtimeValuesCache.get(key);
  if (values === undefined) {
    const missing = names.filter((name) => !(name in RUNTIME));
    if (missing.length > 0) {
      throw new Error(
        `native runtime compile: @lifeart/gxt does not export ${missing.join(', ')} (a symbol the gxt compiler emits under NATIVE_FLAGS)`
      );
    }
    values = names.map((name) => RUNTIME[name]);
    runtimeValuesCache.set(key, values);
  }
  return values;
}

function describeErrors(result: TemplateSource, moduleName: string): string {
  const details = result.errors
    .map((error) => {
      const e = error as { message?: string; line?: number; column?: number };
      return e.line !== undefined
        ? `${e.message} (${moduleName} @ L${e.line}:C${e.column})`
        : e.message;
    })
    .join('\n');
  return `Template compilation failed:\n${details}`;
}

const VALID_IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

function compileToFunction(
  templateSource: string,
  {
    moduleName,
    bindings,
    lexicalScope,
    strictMode,
    evaluate,
  }: {
    moduleName: string;
    bindings: readonly string[];
    lexicalScope?: (name: string) => boolean;
    /** `false`: a LOOSE template — free names resolve by name. */
    strictMode: boolean;
    evaluate: Evaluator;
  }
): GxtTemplate {
  const result = compileTemplateSource(templateSource, {
    // DEBUG: also the argument labels (the debug labels of helper / modifier
    // argument references).
    flags: DEBUG ? NATIVE_DEBUG_FLAGS : NATIVE_FLAGS,
    bindings: new Set(bindings),
    moduleName,
    lexicalScope,
    strictMode,
  });
  if (result.errors.length > 0) {
    throw new Error(describeErrors(result, moduleName));
  }
  const names = result.scopeNames;
  return evaluate(result.source, names, runtimeValues(names));
}

// Bind the runtime identifiers + the lexical scope values as parameters of a
// fresh function whose body returns the template function.
function evaluateWithScope(scope: Record<string, unknown>): Evaluator {
  const scopeNames = Object.keys(scope);
  for (const name of scopeNames) {
    if (!VALID_IDENTIFIER.test(name)) {
      throw new Error(`native runtime compile: invalid scope name \`${name}\``);
    }
  }
  const scopeValues = scopeNames.map((name) => scope[name]);
  return (source, names, values) => {
    const shadowed = new Set(scopeNames);
    const runtimeNames = names.filter((name) => !shadowed.has(name));
    const runtimeVals = values.filter((_, i) => !shadowed.has(names[i]!));
    const make = new Function(...runtimeNames, ...scopeNames, `"use strict";\nreturn ${source};`);
    return make(...runtimeVals, ...scopeValues) as GxtTemplate;
  };
}

/**
 * `internal-test-helpers/lib/compile`: compile a template string to a native
 * TemplateFactory. Loose by default (`strictMode: false`, the classic test
 * helper default): `this` is the host-supplied self.
 */
export default function compile(
  templateSource: string,
  options: CompileOptions = {},
  scopeValues: Record<string, unknown> = {}
): NativeTemplateFactory {
  const moduleName = options.moduleName ?? options.meta?.moduleName ?? '(unknown template module)';
  const strictMode = options.strictMode === true;
  const template = compileToFunction(templateSource, {
    moduleName,
    bindings: Object.keys(scopeValues),
    strictMode,
    evaluate: evaluateWithScope(scopeValues),
  });
  if (!strictMode) markLooseTemplate(template);
  return factoryForTemplate(template);
}

// ---------------------------------------------------------------- template()
interface TemplateOptions {
  strictMode?: boolean;
  moduleName?: string;
  component?: object;
  scope?: () => Record<string, unknown>;
  eval?: (source: string) => unknown;
}

// The implicit (`eval`) form: a name is lexical when the caller's eval can
// resolve it (`eval('name')` throws a ReferenceError otherwise).
function evalScope(userEval: (source: string) => unknown): (name: string) => boolean {
  return (name) => {
    if (!VALID_IDENTIFIER.test(name) || name === 'this' || name === 'arguments') return false;
    try {
      userEval(name);
      return true;
    } catch (error) {
      if (error instanceof ReferenceError || error instanceof SyntaxError) return false;
      throw error;
    }
  };
}

function evaluateWithEval(userEval: (source: string) => unknown): Evaluator {
  return (source, names, values) => {
    const make = userEval(
      `(function (${names.join(', ')}) { "use strict"; return ${source}; })`
    ) as (...args: unknown[]) => GxtTemplate;
    return make(...values);
  };
}

/**
 * `@ember/template-compiler/runtime` `template()`: a runtime `<template>`.
 * Strict mode by default; lexical scope from `scope: () => ({…})` (explicit)
 * or the caller's `eval` (implicit). With `component`, the template becomes
 * that class's template; otherwise a template-only component.
 */
export function template(templateString: string, options: TemplateOptions = {}): object {
  const moduleName = options.moduleName ?? '(runtime template)';
  let compiled: GxtTemplate;
  let explicitThis: { value: unknown } | null = null;
  const strictMode = options.strictMode !== false;
  if (typeof options.eval === 'function') {
    compiled = compileToFunction(templateString, {
      moduleName,
      bindings: [],
      lexicalScope: evalScope(options.eval),
      strictMode,
      evaluate: evaluateWithEval(options.eval),
    });
  } else {
    const scope = Object.assign({}, options.scope?.());
    if (Object.prototype.hasOwnProperty.call(scope, 'this')) {
      // `scope: () => ({ this: state })`: the template's self is `state`.
      explicitThis = { value: scope['this'] };
      delete scope['this'];
    }
    compiled = compileToFunction(templateString, {
      moduleName,
      bindings: Object.keys(scope),
      strictMode,
      evaluate: evaluateWithScope(scope),
    });
  }
  if (explicitThis !== null) {
    const inner = compiled;
    const self = explicitThis.value;
    compiled = $_tpl(function ExplicitThisTemplate(this: Record<symbol, unknown>): unknown {
      this[$SELF] = self;
      return inner.apply(this, arguments as unknown as unknown[]);
    }) as GxtTemplate;
  }
  if (!strictMode) markLooseTemplate(compiled);
  const component = options.component ?? templateOnlyComponent(moduleName);
  if (DEBUG && typeof component !== 'object' && typeof component !== 'function') {
    throw new Error('template(): `component` must be a component class or definition');
  }
  return setComponentTemplate(factoryForTemplate(compiled), component);
}
