// The published `@ember/template-compiler` of the compat build: the classic
// entry's surface, whose `template()` compiles through the gxt pipeline in GXT
// builds, with the gxt runtime compiler installed. A precompiled app that never
// imports it ships no compiler.
import { installRuntimeCompiler } from './runtime-compiler-install';
import { template as emberTemplate } from '@ember/template-compiler/lib/public-api';

export type { EmberPrecompileOptions } from '@ember/template-compiler/lib/public-api';
export { ALLOWED_GLOBALS } from '@ember/template-compiler/lib/plugins/allowed-globals';

installRuntimeCompiler();

export const template: typeof emberTemplate = ((...args: Parameters<typeof emberTemplate>) => {
  installRuntimeCompiler();
  return emberTemplate(...args);
}) as typeof emberTemplate;
