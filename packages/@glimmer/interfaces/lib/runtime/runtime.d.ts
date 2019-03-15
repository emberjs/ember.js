import { Environment } from './environment';
import { RuntimeHeap, RuntimeConstants, RuntimeOp } from '../program';
import {
  RuntimeResolverDelegate,
  RuntimeResolver,
  JitRuntimeResolver,
  AotRuntimeResolver,
} from '../serialize';

/**
  The Runtime is the set of static structures that contain the compiled
  code and any host configuration.

  The contents of the Runtime do not change as the VM executes, unlike
  the VM state.
 */
export interface RuntimeContext<R = unknown> {
  env: Environment;
  program: RuntimeProgram;
  resolver: RuntimeResolver<R>;
}

export interface AotRuntimeContext<R = unknown> {
  env: Environment;
  program: RuntimeProgram;
  resolver: AotRuntimeResolver<R>;
}

export interface JitRuntimeContext<R = unknown> extends RuntimeContext<R> {
  resolver: JitRuntimeResolver<R>;
}

export interface RuntimeProgram {
  readonly constants: RuntimeConstants;
  readonly heap: RuntimeHeap;

  opcode(offset: number): RuntimeOp;
}
