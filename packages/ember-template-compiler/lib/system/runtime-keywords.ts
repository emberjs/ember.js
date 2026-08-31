import {
  lookupRuntimeKeyword,
  RUNTIME_KEYWORD_LOCALS,
} from '@ember/template-compiler/-internal-primitives';
import type { EmberPrecompileOptions } from '../types';

/**
 * Binds keywords to bare locals during compilation. Only a caller that
 * also evaluates the output can use this, because the emitted `scope`
 * references the locals and the evaluator must supply the values from
 * `RUNTIME_KEYWORD_LOCALS`. `precompile()` output stays plain JSON, so
 * consumers such as FastBoot can `JSON.parse` it; their keywords resolve
 * through the built-in tables instead.
 */
export function withRuntimeKeywords(
  options: Partial<EmberPrecompileOptions>
): Partial<EmberPrecompileOptions> {
  let lexicalScope = options.lexicalScope;

  return {
    ...options,
    meta: { ...options.meta, emberRuntime: { lookupKeyword: lookupRuntimeKeyword } },
    lexicalScope: (variable: string) =>
      variable in RUNTIME_KEYWORD_LOCALS || lexicalScope?.(variable) === true,
  };
}
