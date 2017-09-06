import { Op } from "@glimmer/vm";
import { APPEND_OPCODES, DebugMetadata, NormalizedMetadata, DebugBeforeFunction, DebugStackChangeFunction } from './opcodes';
import { Option } from "@glimmer/interfaces";

// Once all opcodes are annotated, this can be the default. For now, make sure
// we actually annotated all of them before trying to use the metadata in
// assertions
const DEFAULT_METADATA = {
  stackChange: 0,
  operands: 0 as 0
};

export function OPCODE_METADATA<Name extends Op, State>(name: Name, metadata: DebugMetadata<State> = DEFAULT_METADATA): void {
  if (APPEND_OPCODES.debugMetadata[name as number]) {
    throw new Error('BUG: Appended Opcode Metadata twice');
  }

  let before: Option<DebugBeforeFunction>;
  let providedBefore = metadata.before;

  if (typeof providedBefore === 'function') {
    before = providedBefore;
  } else {
    before = null;
  }

  let stackChange: DebugStackChangeFunction<State>;
  const providedStackChange = metadata.stackChange;

  if (typeof providedStackChange === 'function') {
    stackChange = providedStackChange;
  } else if (typeof providedStackChange === 'number') {
    stackChange = () => providedStackChange;
  } else {
    stackChange = () => 0;
  }

  let operands = metadata.operands === undefined ? 0 : metadata.operands;

  let normalized: NormalizedMetadata = {
    before,
    stackChange,
    operands
  };

  APPEND_OPCODES.debugMetadata[name as number] = normalized;
}
