import {
  WholeProgramCompilationContext,
  RuntimeProgram,
  CompileMode,
  STDLib,
} from '@glimmer/interfaces';
import { Constants, CompileTimeHeapImpl, RuntimeOpImpl } from '@glimmer/program';
import LazyCompileTimeLookup from './lookup';
import LazyRuntimeResolver from './runtime-resolver';
import { compileStd } from '@glimmer/opcode-compiler';

export class TestLazyCompilationContext implements WholeProgramCompilationContext, RuntimeProgram {
  readonly constants = new Constants(this.runtimeResolver);
  readonly resolverDelegate: LazyCompileTimeLookup;
  readonly heap = new CompileTimeHeapImpl();
  readonly mode = CompileMode.jit;
  readonly stdlib: STDLib;

  constructor(private runtimeResolver: LazyRuntimeResolver) {
    this.stdlib = compileStd(this);
    this.resolverDelegate = new LazyCompileTimeLookup(runtimeResolver);

    this._opcode = new RuntimeOpImpl(this.heap);
  }

  // TODO: This sucks
  private _opcode: RuntimeOpImpl;

  opcode(offset: number): RuntimeOpImpl {
    this._opcode.offset = offset;
    return this._opcode;
  }
}
