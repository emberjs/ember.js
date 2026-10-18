// The seam between the compat render layer (compile.ts, template-function.ts)
// and the gxt runtime compiler (`@lifeart/gxt/runtime-compiler`, ~32 KB brotli
// with the compiler chunk it shares with the build-time compiler).
//
// A precompiled app never compiles a template at runtime, so its closure must
// not carry the compiler: the render layer imports only this seam, and the
// entries an app compiles through at runtime — `@ember/template-compilation`,
// `@ember/template-compiler`, `@ember/template-compiler/runtime`,
// `ember-template-compiler` — install it here (`./runtime-compiler-install`,
// which loads the compiler). The runtime symbol table and
// `setupGlobalScope` come from `@lifeart/gxt/runtime-scope`, which carries no
// compiler either.
import type { compileTemplate, escapeBindingName } from '@lifeart/gxt/runtime-compiler';

export interface GxtRuntimeCompiler {
  compileTemplate: typeof compileTemplate;
  escapeBindingName: typeof escapeBindingName;
}

let installed: GxtRuntimeCompiler | null = null;

export function installGxtRuntimeCompiler(compiler: GxtRuntimeCompiler): void {
  installed = compiler;
}

export function hasGxtRuntimeCompiler(): boolean {
  return installed !== null;
}

/** The installed runtime compiler; throws when the app loaded none. */
export function gxtRuntimeCompiler(): GxtRuntimeCompiler {
  if (installed === null) {
    throw new Error(
      'A template reached runtime compilation, but no template compiler is loaded: a precompiled app ships none. ' +
        'Compile the template at build time, or import `ember-template-compiler`, `@ember/template-compiler` ' +
        'or `@ember/template-compilation` (each loads the gxt runtime compiler) in the module that compiles at runtime.'
    );
  }
  return installed;
}
