import {
  WholeProgramCompilationContext,
  CompileTimeResolverDelegate,
  CompileTimeHeap,
  CompileMode,
  STDLib,
  RuntimeHeap,
  CompileTimeConstants,
  RuntimeConstants,
} from '@glimmer/interfaces';
import { WriteOnlyConstants, HeapImpl, Constants } from '@glimmer/program';
import { compileStd } from './opcode-builder/helpers/stdlib';
import { DebugConstants } from '@glimmer/bundle-compiler';
import { DEBUG } from '@glimmer/local-debug-flags';

export class ProgramCompilationContext implements WholeProgramCompilationContext {
  readonly constants = DEBUG ? new DebugConstants() : new WriteOnlyConstants();
  readonly resolverDelegate: CompileTimeResolverDelegate;
  readonly heap: CompileTimeHeap = new HeapImpl();
  readonly stdlib: STDLib;

  constructor(delegate: CompileTimeResolverDelegate, readonly mode: CompileMode) {
    this.resolverDelegate = delegate;
    this.stdlib = compileStd(this);
  }
}

export class JitProgramCompilationContext implements JitProgramCompilationContext {
  readonly constants: CompileTimeConstants & RuntimeConstants = DEBUG
    ? new DebugConstants()
    : new Constants();
  readonly resolverDelegate: CompileTimeResolverDelegate;
  readonly heap: CompileTimeHeap & RuntimeHeap = new HeapImpl();
  readonly stdlib: STDLib;
  readonly mode: CompileMode = CompileMode.jit;

  constructor(delegate: CompileTimeResolverDelegate) {
    this.resolverDelegate = delegate;
    this.stdlib = compileStd(this);
  }
}
