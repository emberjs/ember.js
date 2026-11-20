// Loads the gxt runtime compiler and installs it on the seam
// (runtime-compiler-seam.ts). The entries an app compiles templates through at
// runtime call `installRuntimeCompiler`: the published
// `@ember/template-compilation` (template-compilation-entry.ts),
// `@ember/template-compiler` and `@ember/template-compiler/runtime`
// (template-compiler-entry.ts, template-compiler-runtime-entry.ts) and
// `ember-template-compiler` (ember-template-compiler.ts). Each calls it when it
// loads and again from each export that compiles, so the compiler is installed
// whenever such an export is used, also in an app bundle whose bundler leaves
// out what a module does on load when the module is not listed in the
// package's `sideEffects`. The render layer never imports this module, so a
// precompiled app ships no compiler.
import { compileTemplate, escapeBindingName } from '@lifeart/gxt/runtime-compiler';
import { installGxtRuntimeCompiler } from './runtime-compiler-seam';

const RUNTIME_COMPILER = { compileTemplate, escapeBindingName };

export function installRuntimeCompiler(): void {
  installGxtRuntimeCompiler(RUNTIME_COMPILER);
}
