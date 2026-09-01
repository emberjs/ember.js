import {
  type PrecompiledModule,
  precompileModule as glimmerPrecompileModule,
} from '@glimmer/compiler';
import { precompileAot } from '@glimmer/opcode-compiler/lib/aot/precompile';
import type { EmberPrecompileOptions } from '../types';
import compileOptions from './compile-options';

/**
  Compiles a template into a JavaScript expression plus the imports it
  needs. A strict template compiles all the way to VM words, so no compiler
  ships to the browser for it. A loose template keeps its wire format
  opcodes as imported objects and resolves names at runtime.

  @private
  @method precompileModule
*/
export default function precompileModule(
  templateString: string,
  options: Partial<EmberPrecompileOptions> = {}
): PrecompiledModule {
  let compiled = compileOptions(options);

  if (compiled.strictMode) {
    return precompileAot(templateString, {
      ...compiled,
      factory: { module: '@ember/template-factory/aot', name: 'createTemplateFactory' },
    });
  }

  let result = glimmerPrecompileModule(templateString, compiled);

  return {
    ...result,
    factory: { module: '@ember/template-factory/loose', name: 'createTemplateFactory' },
  };
}
