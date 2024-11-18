import type {
  ClassicResolver,
  CreateRuntimeOp,
  Environment,
  EvaluationContext,
  Nullable,
  Program,
  ProgramConstants,
  ProgramHeap,
  RuntimeArtifacts,
  RuntimeOptions,
  STDLib,
} from '@glimmer/interfaces';

import { compileStd } from './opcode-builder/helpers/stdlib';

export class EvaluationContextImpl implements EvaluationContext {
  readonly constants: ProgramConstants;
  readonly heap: ProgramHeap;
  readonly resolver: Nullable<ClassicResolver>;
  readonly stdlib: STDLib;
  readonly createOp: CreateRuntimeOp;
  readonly env: Environment;
  readonly program: Program;

  constructor(
    { constants, heap }: RuntimeArtifacts,
    createOp: CreateRuntimeOp,
    runtime: RuntimeOptions
  ) {
    this.constants = constants;
    this.heap = heap;
    this.resolver = runtime.resolver;
    this.createOp = createOp;
    this.env = runtime.env;
    this.program = runtime.program;

    this.stdlib = compileStd(this);
  }
}
