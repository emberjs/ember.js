// gxt NATIVE layer, TEST PAGES ONLY — `@ember/template-compilation` as
// `@ember/test-helpers` imports it (vite.config.mjs nativeConfig,
// `gxtNativeTestHelpersTemplates`).
//
// `@ember/test-helpers` calls `precompileTemplate` with static strings at
// module scope (its `{{outlet}}`, empty and `<this.ProvidedComponent />`
// templates). The gxt compiler does not process node_modules, so those strings
// reach runtime, where the native build's `precompileTemplate` has no compiler
// (template-compilation.ts). The test pages do carry the native runtime
// compiler: compile them with it. Apps never load this module.
import compile from '../runtime-compile';
import { precompileTemplate as nativePrecompileTemplate } from '../template-compilation';

export * from '../template-compilation';

export function precompileTemplate(
  template: Parameters<typeof nativePrecompileTemplate>[0],
  options?: Parameters<typeof nativePrecompileTemplate>[1]
): ReturnType<typeof nativePrecompileTemplate> {
  if (typeof template === 'string') {
    let { strictMode, moduleName, scope } = options ?? {};
    return compile(template, { strictMode, moduleName }, scope?.() ?? {}) as ReturnType<
      typeof nativePrecompileTemplate
    >;
  }
  return nativePrecompileTemplate(template, options);
}
