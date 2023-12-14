declare module 'ember-template-compiler/lib/system/compile-options' {
  import type { EmberPrecompileOptions, PluginFunc } from 'ember-template-compiler/lib/types';
  export function buildCompileOptions(_options: EmberPrecompileOptions): EmberPrecompileOptions;
  export function transformsFor(options: EmberPrecompileOptions): readonly PluginFunc[];
  export default function compileOptions(
    _options?: Partial<EmberPrecompileOptions>
  ): EmberPrecompileOptions;
}
