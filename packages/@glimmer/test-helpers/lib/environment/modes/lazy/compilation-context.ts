import {
  WholeProgramCompilationContext,
  RuntimeProgram,
  CompileMode,
  STDLib,
} from '@glimmer/interfaces';
import { Constants, CompileTimeHeapImpl, RuntimeProgramImpl } from '@glimmer/program';
import LazyCompileTimeLookup from './lookup';
import LazyRuntimeResolver from './runtime-resolver';
import { compileStd } from '@glimmer/opcode-compiler';

export class TestLazyCompilationContext implements WholeProgramCompilationContext {
  readonly constants = new Constants(this.runtimeResolver);
  readonly resolverDelegate: LazyCompileTimeLookup;
  readonly heap = new CompileTimeHeapImpl();
  readonly mode = CompileMode.jit;
  readonly stdlib: STDLib;

  constructor(private runtimeResolver: LazyRuntimeResolver) {
    this.stdlib = compileStd(this);
    this.resolverDelegate = new LazyCompileTimeLookup(runtimeResolver);
  }

  program(): RuntimeProgram {
    return new RuntimeProgramImpl(this.constants, this.heap);
  }
}
