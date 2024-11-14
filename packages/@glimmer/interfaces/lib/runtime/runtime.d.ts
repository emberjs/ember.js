import type { ProgramConstants, ProgramHeap, RuntimeOp } from '../program.js';

export interface Program {
  readonly constants: ProgramConstants;
  readonly heap: ProgramHeap;

  opcode(offset: number): RuntimeOp;
}

export interface RuntimeArtifacts {
  readonly constants: ProgramConstants;
  readonly heap: ProgramHeap;
}
