// The published `@ember/template-compilation` of the compat build: the render
// layer's `precompileTemplate` / `compileTemplate` (compile.ts) with the gxt
// runtime compiler installed, so an app that compiles a template at runtime
// through this entry (a `precompileTemplate` string, `compileTemplate`) can.
// Ember's own modules import `@ember/template-compilation` as compile.ts itself
// (the `shim` of the alias table), so a precompiled app ships no compiler.
import { installRuntimeCompiler } from './runtime-compiler-install';
import {
  precompileTemplate as renderLayerPrecompileTemplate,
  compileTemplate as renderLayerCompileTemplate,
  __emberTemplateCompiler as renderLayerTemplateCompiler,
} from './compile';

export { __registerTemplateCompiler } from './compile';

installRuntimeCompiler();

export function precompileTemplate(
  ...args: Parameters<typeof renderLayerPrecompileTemplate>
): ReturnType<typeof renderLayerPrecompileTemplate> {
  installRuntimeCompiler();
  return renderLayerPrecompileTemplate(...args);
}

export function compileTemplate(
  ...args: Parameters<typeof renderLayerCompileTemplate>
): ReturnType<typeof renderLayerCompileTemplate> {
  installRuntimeCompiler();
  return renderLayerCompileTemplate(...args);
}

export const __emberTemplateCompiler = {
  ...renderLayerTemplateCompiler,
  compile: compileTemplate,
};
