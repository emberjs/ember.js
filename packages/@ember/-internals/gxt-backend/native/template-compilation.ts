// gxt NATIVE layer — alias target for `@ember/template-compilation`.
//
// `precompileTemplate()` is a BUILD-TIME macro. In the native build the gxt
// compiler compiles every call at build time (under NATIVE_FLAGS
// .EMBER_NATIVE): it replaces the template STRING with a template MAKER —
// `(scopeValues) => $_tpl(function () {…})`, the template's lexical names bound
// from the call's `scope: () => ({…})` — and leaves the call and its options in
// place. At runtime this `precompileTemplate(maker, options)` returns a native
// TemplateFactory that makes the template on first use (`scope()` read lazily,
// like Glimmer) and marks it LOOSE unless `strictMode: true` (Ember's default
// is loose: rendered with a host self — a route's controller — via
// NATIVE_FLAGS.EMBER_SELF).
//
// A call whose string survived the build (a non-static template / options, a
// module the gxt compiler did not process) cannot be compiled without a
// runtime compiler: it returns a PLACEHOLDER factory (template-factory.ts) that
// throws when rendered — module evaluation and `factory(owner)` stay clean, so
// the failure points at the real gap.
//
// `compileTemplate()` (runtime compilation) works once a runtime compiler has
// been registered (`__registerTemplateCompiler`) — the native entry for that is
// `native/runtime-compile.ts` (tests / @ember/template-compiler/runtime).
import { DEBUG } from '@glimmer/env';
import {
  lazyFactoryForTemplate,
  failingTemplateFactory,
  markLooseTemplate,
  type GxtTemplate,
  type NativeTemplateFactory,
} from './template-factory';
import { recordLexicalNames } from './managers';

interface TemplateCompiler {
  compile(...args: unknown[]): unknown;
}

export let __emberTemplateCompiler: undefined | TemplateCompiler;

export function __registerTemplateCompiler(c: TemplateCompiler): void {
  __emberTemplateCompiler = c;
}

export const compileTemplate = (...args: unknown[]): unknown => {
  if (!__emberTemplateCompiler) {
    throw new Error(
      'Attempted to call `compileTemplate` without first loading the runtime template compiler.'
    );
  }
  return __emberTemplateCompiler.compile(...args);
};

interface PrecompileOptions {
  strictMode?: boolean;
  scope?: () => Record<string, unknown>;
  moduleName?: string;
}

/** The gxt template maker that replaced a `precompileTemplate` string. */
type TemplateMaker = (scopeValues: Record<string, unknown>) => GxtTemplate;

const NO_SCOPE: Readonly<Record<string, unknown>> = Object.freeze({});

export function precompileTemplate(
  template: string | TemplateMaker,
  options?: PrecompileOptions
): NativeTemplateFactory {
  if (typeof template === 'function') {
    const loose = options?.strictMode !== true;
    const scope = options?.scope;
    return lazyFactoryForTemplate(() => {
      const scopeValues = scope === undefined ? NO_SCOPE : scope();
      // Record the scope's lexical names so the debug render tree can name a
      // component invoked through a binding (e.g. an anonymous `templateOnly()`
      // passed as `scope: () => ({ Foo })`) by that binding.
      if (DEBUG && scope !== undefined) recordLexicalNames(scopeValues);
      const compiled = template(scopeValues);
      if (loose) markLooseTemplate(compiled);
      return compiled;
    });
  }
  return failingTemplateFactory(
    `precompileTemplate: a template string reached runtime (${
      options?.moduleName ?? 'unknown module'
    }). The gxt-native build has no runtime template compiler: \`precompileTemplate\` must be called with a static template string and static options (\`strictMode\` literal, \`scope: () => ({ … })\`) so the gxt compiler compiles it at build time.`
  );
}
