import {
  type PrecompiledModule,
  precompileModule as glimmerPrecompileModule,
} from '@glimmer/compiler';
import type { EmberPrecompileOptions } from '../types';
import compileOptions from './compile-options';

/**
  Compiles a template into a JavaScript expression whose wire format opcodes
  are identifiers. The build tool binds each identifier to an import.

  @private
  @method precompileModule
*/
export default function precompileModule(
  templateString: string,
  options: Partial<EmberPrecompileOptions> = {}
): PrecompiledModule {
  return glimmerPrecompileModule(templateString, compileOptions(options));
}
