import { Op } from "@glimmer/vm";
import { APPEND_OPCODES, DebugMetadata } from './opcodes';

// Once all opcodes are annotated, this can be the default. For now, make sure
// we actually annotated all of them before trying to use the metadata in
// assertions
const DEFAULT_METADATA = {
  stackChange: 0,
  operands: 0 as 0
};

export function OPCODE_METADATA<Name extends Op>(name: Name, metadata: DebugMetadata = DEFAULT_METADATA): void {
  metadata = Object.assign(DEFAULT_METADATA, metadata);
  APPEND_OPCODES.debugMetadata[name as number] = metadata;
}
