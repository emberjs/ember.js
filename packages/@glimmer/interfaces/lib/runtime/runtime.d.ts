import { Environment } from './environment';
import { RuntimeHeap, RuntimeConstants, RuntimeOp } from '../program';
import { RuntimeResolver } from '../serialize';

/**
  The Runtime is the set of static structures that contain the compiled
  code and any host configuration.

  The contents of the Runtime do not change as the VM executes, unlike
  the VM state.
 */
export interface RuntimeContext<R = unknown, E = unknown> {
  env: Environment<E>;
  program: RuntimeProgram;
  resolver: RuntimeResolver<R>;
}

export interface RuntimeProgram {
  readonly constants: RuntimeConstants;
  readonly heap: RuntimeHeap;

  opcode(offset: number): RuntimeOp;
}

export interface RuntimeArtifacts {
  readonly constants: RuntimeConstants;
  readonly heap: RuntimeHeap;
}
