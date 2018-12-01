import { MachineRegister, Op, MachineOp } from '@glimmer/vm';
import { Opcode, Option } from '@glimmer/interfaces';
import { RuntimeConstants } from '@glimmer/program';
import { OperandType } from './opcode-metadata-parser';

export interface VM {
  fetchValue(register: MachineRegister): number;
  stack: {
    peek(count?: number): unknown;
  };
}

export type OperandSize = 0 | 1 | 2 | 3;

export type OperandList = [] | [Operand] | [Operand, Operand] | [Operand, Operand, Operand];

export type DebugStackChangeFunction<State> = ((
  {
    opcode,
    constants,
    state,
  }: { opcode: Opcode; constants: RuntimeConstants<unknown>; state: State }
) => number);
export type DebugBeforeFunction = (opcode: Opcode, vm: VM) => unknown;

export interface Operand {
  type: OperandType;
  name: string;
}

function Handle(name: string): Operand {
  return { type: 'handle', name };
}

function I32(name: string): Operand {
  return { type: 'i32', name };
}

function TO(name: string): Operand {
  return { type: 'to', name };
}

function Bool(name: string): Operand {
  return { type: 'bool', name };
}

function Str(name: string): Operand {
  return { type: 'str', name };
}

function OptionStr(name: string): Operand {
  return { type: 'option-str', name };
}

function StrArray(name: string): Operand {
  return { type: 'str-array', name };
}

function NumArray(name: string): Operand {
  return { type: 'array', name };
}

function ScopeSymbol(name: string): Operand {
  return { type: 'symbol', name };
}

function ScopeBlock(name: string): Operand {
  return { type: 'block', name };
}

function Primitive(name: string): Operand {
  return { type: 'primitive', name };
}

function SymbolTable(name: string): Operand {
  return { type: 'table', name };
}

function Register(name: string): Operand {
  return { type: 'register', name };
}

function Serializable(name: string): Operand {
  return { type: 'serializable', name };
}

function LazyConstant(name: string): Operand {
  return { type: 'lazy-constant', name };
}

export interface DebugMetadata<State = undefined> {
  name: string;
  before?: (opcode: Opcode, vm: VM) => State;
  stackChange?: DebugStackChangeFunction<State> | number;
  ops?: OperandList;
  skipCheck?: true;
}

export interface NormalizedMetadata<State = undefined> {
  name: string;
  before: Option<DebugBeforeFunction>;
  stackChange: DebugStackChangeFunction<State>;
  ops: OperandList;
  operands: number;
  check: boolean;
}

const METADATA: Option<NormalizedMetadata<any>>[] = fillNulls(Op.Size);
const MACHINE_METADATA: Option<NormalizedMetadata<any>>[] = fillNulls(Op.Size);

export function opcodeMetadata(
  op: MachineOp | Op,
  isMachine: 0 | 1
): Option<NormalizedMetadata<any>> {
  let value = isMachine ? MACHINE_METADATA[op] : METADATA[op];

  return value || null;
}

enum OpcodeKind {
  Machine,
  Syscall,
}

const MACHINE = OpcodeKind.Machine;
const SYSCALL = OpcodeKind.Syscall;

export function OPCODE_METADATA<State>(
  name: Op,
  metadata: DebugMetadata<State>,
  kind: OpcodeKind.Syscall
): void;
export function OPCODE_METADATA<State, Name extends Op | MachineOp = Op | MachineOp>(
  name: MachineOp,
  metadata: DebugMetadata<State>,
  kind: OpcodeKind.Machine
): void;
export function OPCODE_METADATA<State, Name extends Op | MachineOp = Op | MachineOp>(
  name: Name,
  metadata: DebugMetadata<State>,
  kind: OpcodeKind
): void {
  let meta = kind === OpcodeKind.Machine ? MACHINE_METADATA : METADATA;

  if (meta[name as number]) {
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

  let ops: OperandList = metadata.ops === undefined ? [] : metadata.ops;

  let normalized: NormalizedMetadata<State> = {
    name: metadata.name,
    check: metadata.skipCheck ? false : true,
    ops,
    before,
    stackChange,
    operands: ops.length,
  };

  meta[name as number] = normalized;
}

export function fillNulls<T>(count: number): T[] {
  let arr = new Array(count);

  for (let i = 0; i < count; i++) {
    arr[i] = null;
  }

  return arr;
}
