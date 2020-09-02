import {
  STDLib,
  CompileTimeCompilationContext,
  CompileTimeResolver,
  CompileTimeHeap,
  CompileTimeConstants,
  CompileTimeArtifacts,
} from '@glimmer/interfaces';
import { compileStd } from './opcode-builder/helpers/stdlib';

export class CompileTimeCompilationContextImpl implements CompileTimeCompilationContext {
  readonly constants: CompileTimeConstants;
  readonly heap: CompileTimeHeap;
  readonly stdlib: STDLib;

  constructor({ constants, heap }: CompileTimeArtifacts, readonly resolver: CompileTimeResolver) {
    this.constants = constants;
    this.heap = heap;
    this.stdlib = compileStd(this);
  }
}
