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
 * Compiles through the shared `compile`, with the Glimmer compiler's options as given
 * (`glimmerOnly`: not yet Ember's `compileOptions`).
 */
export function createTemplate(
  templateSource: Nullable<string>,
  options: PrecompileOptions | PrecompileOptionsWithLexicalScope = {},
  scopeValues: Record<string, unknown> = {}
): TemplateFactory {
  return compile(templateSource as string, {
    scope: () => scopeValues,
    glimmerOnly: { options },
  });
}
