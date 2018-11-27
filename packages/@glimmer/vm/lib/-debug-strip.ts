import { Op, MachineOp } from './opcodes';
import { Option, Opaque, Opcode } from '@glimmer/interfaces';
import { fillNulls } from '@glimmer/util';
import { RuntimeConstants } from '@glimmer/program';
import { MachineRegister, $fp, $sp } from './registers';

export interface VM {
  fetchValue(register: MachineRegister): number;
  stack: {
    peek(count?: number): Opaque;
  };
}

export type OperandSize = 0 | 1 | 2 | 3;

export type DebugStackChangeFunction<State> = ((
  {
    opcode,
    constants,
    state,
  }: { opcode: Opcode; constants: RuntimeConstants<unknown>; state: State }
) => number);
export type DebugBeforeFunction = (opcode: Opcode, vm: VM) => Opaque;

export type OperandType =
  | 'handle'
  | 'i32'
  | 'to'
  | 'str'
  | 'option-str'
  | 'str-array'
  | 'array'
  | 'bool'
  | 'primitive'
  | 'table'
  | 'symbol'
  | 'block'
  | 'register'
  | 'serializable'
  | 'lazy-constant';

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
  operands?: OperandSize;
  ops?: Operand[];
  skipCheck?: true;
}

export interface NormalizedMetadata<State = undefined> {
  name: string;
  before: Option<DebugBeforeFunction>;
  stackChange: DebugStackChangeFunction<State>;
  operands: OperandSize;
  ops: Operand[];
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

  let operands = metadata.operands === undefined ? 0 : metadata.operands;
  let ops = metadata.ops === undefined ? [] : metadata.ops;

  let normalized: NormalizedMetadata<State> = {
    name: metadata.name,
    check: metadata.skipCheck ? false : true,
    ops,
    before,
    stackChange,
    operands,
  };

  meta[name as number] = normalized;
}

/// helpers ///

/// MACHINE ///

OPCODE_METADATA(
  MachineOp.InvokeVirtual,
  {
    name: 'InvokeVirtual',
    stackChange: -1,
  },
  MACHINE
);

OPCODE_METADATA(
  MachineOp.InvokeStatic,
  {
    name: 'InvokeStatic',
    ops: [Handle('handle')],
    operands: 1,
  },
  MACHINE
);

OPCODE_METADATA(
  MachineOp.Jump,
  {
    name: 'Jump',
    ops: [TO('to')],
    operands: 1,
  },
  MACHINE
);

OPCODE_METADATA(
  MachineOp.PushFrame,
  {
    name: 'PushFrame',
    stackChange: 2,
  },
  MACHINE
);

OPCODE_METADATA(
  MachineOp.PopFrame,
  {
    name: 'PopFrame',

    before(_opcode: Opcode, vm: VM): { sp: number; fp: number } {
      return { sp: vm.fetchValue($sp), fp: vm.fetchValue($fp) };
    },

    stackChange({ state }: { state: { sp: number; fp: number } }) {
      return state.fp - state.sp - 1;
    },
  },
  MACHINE
);

OPCODE_METADATA(
  MachineOp.PushSmallFrame,
  {
    name: 'PushSmallFrame',
    stackChange: 1,
  },
  MACHINE
);

OPCODE_METADATA(
  MachineOp.PopSmallFrame,
  {
    name: 'PopFrame',

    before(_opcode: Opcode, vm: VM): { sp: number; fp: number } {
      return { sp: vm.fetchValue($sp), fp: vm.fetchValue($fp) };
    },

    stackChange({ state }: { state: { sp: number; fp: number } }) {
      return state.fp - state.sp;
    },
  },
  MACHINE
);

OPCODE_METADATA(
  MachineOp.Return,
  {
    name: 'Return',
  },
  MACHINE
);

OPCODE_METADATA(
  MachineOp.ReturnTo,
  {
    name: 'ReturnTo',
    ops: [TO('offset')],
    operands: 1,
  },
  MACHINE
);

/// DYNAMIC SCOPE ///

OPCODE_METADATA(
  Op.BindDynamicScope,
  {
    name: 'BindDynamicScope',
    operands: 1,
    stackChange({ opcode: { op1: _names }, constants }) {
      let size = constants.getArray(_names).length;

      return -size;
    },
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.PushDynamicScope,
  {
    name: 'PushDynamicScope',
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.PopDynamicScope,
  {
    name: 'PopDynamicScope',
  },
  SYSCALL
);

/// VM ///

OPCODE_METADATA(
  Op.PushSymbolTable,
  {
    name: 'PushSymbolTable',
    ops: [SymbolTable('table')],
    operands: 1,
    stackChange: 1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.PushBlockScope,
  {
    name: 'PushBlockScope',
    stackChange: 1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.CompileBlock,
  {
    name: 'CompileBlock',
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.InvokeYield,
  {
    name: 'InvokeYield',
    stackChange: -2,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.JumpIf,
  {
    name: 'JumpIf',
    ops: [TO('to')],
    operands: 1,
    stackChange: -1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.JumpUnless,
  {
    name: 'JumpUnless',
    ops: [TO('to')],
    operands: 1,
    stackChange: -1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.JumpEq,
  {
    name: 'JumpEq',
    ops: [TO('to'), I32('comparison')],
    operands: 2,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.AssertSame,
  {
    name: 'AssertSame',
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.Enter,
  {
    name: 'Enter',
    ops: [I32('args')],
    operands: 1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.Exit,
  {
    name: 'Exit',
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.ToBoolean,
  {
    name: 'ToBoolean',
  },
  SYSCALL
);

/// PRELUDE & EXIT ///

OPCODE_METADATA(
  Op.RootScope,
  {
    name: 'RootScope',
    ops: [I32('symbols'), Bool('bindCallerScope')],
    operands: 2,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.VirtualRootScope,
  {
    name: 'VirtualRootScope',
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.ChildScope,
  {
    name: 'ChildScope',
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.PopScope,
  {
    name: 'PopScope',
  },
  SYSCALL
);

/// COMPONENTS ///

OPCODE_METADATA(
  Op.IsComponent,
  {
    name: 'IsComponent',
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.ContentType,
  {
    name: 'ContentType',
    stackChange: 1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.CurryComponent,
  {
    name: 'CurryComponent',
    stackChange: -2,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.PushComponentDefinition,
  {
    name: 'PushComponentDefinition',
    ops: [Handle('definition')],
    operands: 1,
    stackChange: 1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.PushCurriedComponent,
  {
    name: 'PushCurriedComponent',
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.PushArgs,
  {
    name: 'PushArgs',
    ops: [StrArray('names'), I32('positionals'), Bool('synthetic')],
    operands: 3,
    stackChange: 1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.PushEmptyArgs,
  {
    name: 'PushEmptyArgs',
    stackChange: 1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.PrepareArgs,
  {
    name: 'PrepareArgs',
    ops: [Register('state')],
    skipCheck: true,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.CaptureArgs,
  {
    name: 'CaptureArgs',
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.CreateComponent,
  {
    name: 'CreateComponent',
    ops: [I32('flags'), Register('state')],
    operands: 2,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.RegisterComponentDestructor,
  {
    name: 'RegisterComponentDestructor',
    ops: [Register('state')],
    operands: 1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.PutComponentOperations,
  {
    name: 'PutComponentOperations',
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.GetComponentSelf,
  {
    name: 'GetComponentSelf',
    ops: [Register('state')],
    operands: 1,
    stackChange: 1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.GetComponentTagName,
  {
    name: 'GetComponentTagName',
    ops: [Register('state')],
    operands: 1,
    stackChange: 1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.GetComponentLayout,
  {
    name: 'GetComponentLayout',
    ops: [Register('state')],
    operands: 1,
    stackChange: 2,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.SetupForEval,
  {
    name: 'SetupForEval',
    ops: [Register('state')],
    operands: 1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.BindEvalScope,
  {
    name: 'BindEvalScope',
    ops: [Register('state')],
    operands: 1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.InvokeComponentLayout,
  {
    name: 'InvokeComponentLayout',
    ops: [Register('state')],
    stackChange: 0,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.PopulateLayout,
  {
    name: 'PopulateLayout',
    ops: [Register('state')],
    operands: 1,
    stackChange: -2,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.Main,
  {
    name: 'Main',
    ops: [Register('state')],
    operands: 1,
    stackChange: -2,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.BeginComponentTransaction,
  {
    name: 'BeginComponentTransaction',
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.CommitComponentTransaction,
  {
    name: 'CommitComponentTransaction',
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.DidCreateElement,
  {
    name: 'DidCreateElement',
    ops: [Register('state')],
    operands: 1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.DidRenderLayout,
  {
    name: 'DidRenderLayout',
    ops: [Register('state')],
    operands: 1,
  },
  SYSCALL
);

/// DEBUGGER ///

OPCODE_METADATA(
  Op.Debugger,
  {
    name: 'Debugger',
    ops: [StrArray('symbols'), NumArray('evalInfo')],
    operands: 2,
  },
  SYSCALL
);

//// DOM ///

OPCODE_METADATA(
  Op.Text,
  {
    name: 'Text',
    ops: [Str('text')],
    operands: 1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.Comment,
  {
    name: 'Comment',
    ops: [Str('comment')],
    operands: 1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.AppendHTML,
  {
    name: 'AppendHTML',
    stackChange: -1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.AppendSafeHTML,
  {
    name: 'AppendSafeHTML',
    stackChange: -1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.AppendDocumentFragment,
  {
    name: 'AppendDocumentFragment',
    stackChange: -1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.AppendNode,
  {
    name: 'AppendNode',
    stackChange: -1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.AppendText,
  {
    name: 'AppendText',
    stackChange: -1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.ResolveDynamicComponent,
  {
    name: 'ResolveDynamicComponent',
    ops: [Serializable('meta')],
    operands: 1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.PushDynamicComponentInstance,
  {
    name: 'PushDynamicComponentInstance',
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.OpenElement,
  {
    name: 'OpenElement',
    ops: [Str('tag')],
    operands: 1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.OpenDynamicElement,
  {
    name: 'OpenDynamicElement',
    stackChange: -1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.StaticAttr,
  {
    name: 'StaticAttr',
    ops: [Str('name'), Str('value'), OptionStr('namespace')],
    operands: 3,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.DynamicAttr,
  {
    name: 'DynamicAttr',
    ops: [Str('name'), Bool('trusting'), OptionStr('namespace')],
    operands: 3,
    stackChange: -1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.ComponentAttr,
  {
    name: 'ComponentAttr',
    ops: [Str('name'), Bool('trusting'), OptionStr('namespace')],
    operands: 3,
    stackChange: -1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.FlushElement,
  {
    name: 'FlushElement',
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.CloseElement,
  {
    name: 'CloseElement',
  },
  SYSCALL
);

/// WORMHOLE ///

OPCODE_METADATA(
  Op.PushRemoteElement,
  {
    name: 'PushRemoteElement',
    stackChange: -3,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.PopRemoteElement,
  {
    name: 'PopRemoteElement',
  },
  SYSCALL
);

/// MODIFIER ///

OPCODE_METADATA(
  Op.Modifier,
  {
    name: 'Modifier',
    ops: [Handle('helper')],
    operands: 1,
    stackChange: -1,
  },
  SYSCALL
);

/// VM ///

OPCODE_METADATA(
  Op.Constant,
  {
    name: 'Constant',
    ops: [LazyConstant('value')],
    operands: 1,
    stackChange: 1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.Primitive,
  {
    name: 'Primitive',
    ops: [Primitive('primitive')],
    operands: 1,
    stackChange: 1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.PrimitiveReference,
  {
    name: 'PrimitiveReference',
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.ReifyU32,
  {
    name: 'ReifyU32',
    stackChange: 1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.Dup,
  {
    name: 'Dup',
    ops: [Register('register'), I32('offset')],
    operands: 2,
    stackChange: 1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.Pop,
  {
    name: 'Pop',
    ops: [I32('count')],
    operands: 1,
    stackChange({ opcode: { op1: count } }) {
      return -count;
    },
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.Load,
  {
    name: 'Load',
    ops: [Register('register')],
    operands: 1,
    stackChange: -1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.Fetch,
  {
    name: 'Fetch',
    ops: [Register('register')],
    operands: 1,
    stackChange: 1,
  },
  SYSCALL
);

/// EXPRESSIONS ///

OPCODE_METADATA(
  Op.Helper,
  {
    name: 'Helper',
    ops: [Handle('helper')],
    operands: 1,
    stackChange: -1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.SetNamedVariables,
  {
    name: 'SetNamedVariables',
    ops: [Register('register')],
    operands: 1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.SetBlocks,
  {
    name: 'SetBlocks',
    ops: [Register('register')],
    operands: 1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.SetVariable,
  {
    name: 'SetVariable',
    ops: [ScopeSymbol('symbol')],
    operands: 1,
    stackChange: -1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.SetBlock,
  {
    name: 'SetBlock',
    ops: [ScopeSymbol('symbol')],
    operands: 1,
    stackChange: -3,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.GetVariable,
  {
    name: 'GetVariable',
    ops: [ScopeSymbol('symbol')],
    operands: 1,
    stackChange: 1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.GetProperty,
  {
    name: 'GetProperty',
    ops: [Str('key')],
    operands: 1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.GetBlock,
  {
    name: 'GetBlock',
    ops: [ScopeBlock('block')],
    operands: 1,
    stackChange: 3,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.HasBlock,
  {
    name: 'HasBlock',
    ops: [ScopeBlock('block')],
    operands: 1,
    stackChange: 1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.HasBlockParams,
  {
    name: 'HasBlockParams',
    ops: [ScopeBlock('block')],
    stackChange: -2,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.Concat,
  {
    name: 'Concat',
    ops: [I32('size')],
    operands: 1,

    stackChange({ opcode }) {
      return -opcode.op1 + 1;
    },
  },
  SYSCALL
);

/// LIST ///

OPCODE_METADATA(
  Op.EnterList,
  {
    name: 'EnterList',
    ops: [I32('start')],
    operands: 1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.ExitList,
  {
    name: 'ExitList',
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.PutIterator,
  {
    name: 'PutIterator',
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.Iterate,
  {
    name: 'Iterate',
    ops: [I32('end')],
    skipCheck: true,
  },
  SYSCALL
);

/// PARTIAL ///

OPCODE_METADATA(
  Op.InvokePartial,
  {
    name: 'InvokePartial',
    ops: [Serializable('meta'), StrArray('symbols'), NumArray('evalInfo')],
    operands: 3,
    stackChange: 1,
  },
  SYSCALL
);

OPCODE_METADATA(
  Op.ResolveMaybeLocal,
  {
    name: 'ResolveMaybeLocal',
    operands: 1,
    stackChange: 1,
  },
  SYSCALL
);
