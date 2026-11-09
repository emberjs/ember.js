import type { Nullable, Template, TemplateFactory } from '@glimmer/interfaces';
import type { PrecompileOptions, PrecompileOptionsWithLexicalScope } from '@glimmer/syntax';
import { compile } from 'internal-test-helpers/lib/compile';

// TODO: This fundamentally has little to do with testing and
// most tests should just use a more generic preprocess, extracted
// out of the test environment.
export function preprocess(
  templateSource: string,
  options?: PrecompileOptions,
  owner: object = {}
): Template {
  return createTemplate(templateSource, options)(owner);
}

/**
 * Compiles through the shared `compile` (Ember's `compileOptions`). The Glimmer options that
 * IT call sites pass are mapped to the adapter shape: `meta.moduleName` to `moduleName`,
 * `plugins.ast` to `plugins`; `locals` become scope entries (the names only); `keywords` has no Ember
 * equivalent (the strict-mode keyword list is fixed) and is ignored.
 */
export function createTemplate(
  templateSource: Nullable<string>,
  options: PrecompileOptions | PrecompileOptionsWithLexicalScope = {},
  scopeValues: Record<string, unknown> = {}
): TemplateFactory {
  let locals = 'locals' in options && options.locals ? options.locals : [];
  let moduleName = options.meta?.moduleName;
  return compile(templateSource as string, {
    strictMode: options.strictMode,
    moduleName: moduleName ?? undefined,
    plugins: options.plugins?.ast,
    scope: () => ({
      ...Object.fromEntries(locals.map((name) => [name, undefined])),
      ...scopeValues,
    }),
  });
}
