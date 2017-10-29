import { Op } from "./opcodes";
import { Option, Opaque, Opcode } from "@glimmer/interfaces";
import { RuntimeConstants } from "@glimmer/program";
import { fillNulls } from "@glimmer/util";

export interface VM {
  stack: {
    sp: number,
    fp: number,
    peek(count?: number): Opaque;
  };
}

export type OperandSize = 0 | 1 | 2 | 3;

export type DebugStackChangeFunction<State> = (({ opcode, constants, state }: { opcode: Opcode, constants: RuntimeConstants<Opaque>, state: State }) => number);
export type DebugBeforeFunction = (opcode: Opcode, vm: VM) => Opaque;

export type OperandType =
    'handle'
  | 'i32'
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
  | 'lazy-constant'
  ;

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

export interface NormalizedMetadata {
  name: string;
  before: Option<DebugBeforeFunction>;
  stackChange: DebugStackChangeFunction<Opaque>;
  operands: OperandSize;
  ops: Operand[];
  check: boolean;
}

export const METADATA: Option<NormalizedMetadata>[] = fillNulls(Op.Size);

export function OPCODE_METADATA<State, Name extends Op = Op>(name: Name, metadata: DebugMetadata<State>): void {
  if (METADATA[name as number]) {
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

  let normalized: NormalizedMetadata = {
    name: metadata.name,
    check: metadata.skipCheck ? false : true,
    ops,
    before,
    stackChange,
    operands
  };

  METADATA[name as number] = normalized;
}

/// helpers ///

/// DYNAMIC SCOPE ///

OPCODE_METADATA(Op.BindDynamicScope, {
  name: 'BindDynamicScope',
  operands: 1,
  stackChange({ opcode: { op1: _names }, constants }) {
    let size = constants.getArray(_names).length;

    return -size;
  }
});

OPCODE_METADATA(Op.PushDynamicScope, {
  name: 'PushDynamicScope'
});

OPCODE_METADATA(Op.PopDynamicScope, {
  name: 'PopDynamicScope'
});

/// VM ///

OPCODE_METADATA(Op.PushSymbolTable, {
  name: 'PushSymbolTable',
  ops: [SymbolTable('table')],
  operands: 1,
  stackChange: 1
});

OPCODE_METADATA(Op.PushBlockScope, {
  name: 'PushBlockScope',
  stackChange: 1
});

OPCODE_METADATA(Op.CompileBlock, {
  name: 'CompileBlock'
});

OPCODE_METADATA(Op.InvokeVirtual, {
  name: 'InvokeVirtual',
  stackChange: -1
});

OPCODE_METADATA(Op.InvokeStatic, {
  name: 'InvokeStatic',
  ops: [Handle('handle')],
  operands: 1
});

OPCODE_METADATA(Op.InvokeYield, {
  name: 'InvokeYield',
  stackChange: -2
});

OPCODE_METADATA(Op.Jump, {
  name: 'Jump',
  ops: [I32('to')],
  operands: 1
});

OPCODE_METADATA(Op.JumpIf, {
  name: 'JumpIf',
  ops: [I32('to')],
  operands: 1,
  stackChange: -1
});

OPCODE_METADATA(Op.JumpUnless, {
  name: 'JumpUnless',
  ops: [I32('to')],
  operands: 1,
  stackChange: -1
});

OPCODE_METADATA(Op.PushFrame, {
  name: 'PushFrame',
  stackChange: 2
});

OPCODE_METADATA(Op.PopFrame, {
  name: 'PopFrame',

  before(_opcode: Opcode, vm: VM): { sp: number, fp: number } {
    return { sp: vm.stack.sp, fp: vm.stack.fp };
  },

  stackChange({ state }: { state: { sp: number, fp: number } }) {
    return state.fp - state.sp - 1;
  }
});

OPCODE_METADATA(Op.Enter, {
  name: 'Enter',
  ops: [I32('args')],
  operands: 1
});

OPCODE_METADATA(Op.Exit, {
  name: 'Exit',
});

OPCODE_METADATA(Op.ToBoolean, {
  name: 'ToBoolean'
});

/// PRELUDE & EXIT ///

OPCODE_METADATA(Op.RootScope, {
  name: 'RootScope',
  ops: [I32('symbols'), Bool('bindCallerScope')],
  operands: 2
});

OPCODE_METADATA(Op.ChildScope, {
  name: 'ChildScope'
});

OPCODE_METADATA(Op.PopScope, {
  name: 'PopScope'
});

OPCODE_METADATA(Op.Return, {
  name: 'Return'
});

OPCODE_METADATA(Op.ReturnTo, {
  name: 'ReturnTo',
  ops: [I32('offset')],
  operands: 1
});

/// COMPONENTS ///

OPCODE_METADATA(Op.IsComponent, {
  name: 'IsComponent'
});

OPCODE_METADATA(Op.CurryComponent, {
  name: 'CurryComponent',
  stackChange: -2
});

OPCODE_METADATA(Op.PushComponentDefinition, {
  name: 'PushComponentDefinition',
  ops: [Handle('definition')],
  operands: 1,
  stackChange: 1,
});

OPCODE_METADATA(Op.PushDynamicComponentManager, {
  name: 'PushDynamicComponentManager',
  ops: [Serializable('meta')],
  operands: 1
});

OPCODE_METADATA(Op.PushArgs, {
  name: 'PushArgs',
  ops: [StrArray('names'), I32('positionals'), Bool('synthetic')],
  operands: 3,
  stackChange: 1
});

OPCODE_METADATA(Op.PrepareArgs, {
  name: 'PrepareArgs',
  ops: [Register('state')],
  skipCheck: true
});

OPCODE_METADATA(Op.CreateComponent, {
  name: 'CreateComponent',
  ops: [I32('flags'), Register('state')],
  operands: 2
});

OPCODE_METADATA(Op.RegisterComponentDestructor, {
  name: 'RegisterComponentDestructor',
  ops: [Register('state')],
  operands: 1
});

OPCODE_METADATA(Op.PutComponentOperations, {
  name: 'PutComponentOperations'
});

OPCODE_METADATA(Op.GetComponentSelf, {
  name: 'GetComponentSelf',
  ops: [Register('state')],
  operands: 1,
  stackChange: 1
});

OPCODE_METADATA(Op.GetComponentTagName, {
  name: 'GetComponentTagName',
  ops: [Register('state')],
  operands: 1,
  stackChange: 1
});

OPCODE_METADATA(Op.GetComponentLayout, {
  name: 'GetComponentLayout',
  ops: [Register('state')],
  operands: 1,
  stackChange: 2
});

OPCODE_METADATA(Op.InvokeComponentLayout, {
  name: 'InvokeComponentLayout',
  stackChange: -2
});

OPCODE_METADATA(Op.PopulateLayout, {
  name: 'PopulateLayout',
  ops: [Register('state')],
  operands: 1,
  stackChange: -2
});

OPCODE_METADATA(Op.Main, {
  name: 'Main',
  ops: [Register('state')],
  operands: 1,
  stackChange: -2
});

OPCODE_METADATA(Op.BeginComponentTransaction, {
  name: 'BeginComponentTransaction'
});

OPCODE_METADATA(Op.CommitComponentTransaction, {
  name: 'CommitComponentTransaction'
});

OPCODE_METADATA(Op.DidCreateElement, {
  name: 'DidCreateElement',
  ops: [Register('state')],
  operands: 1
});

OPCODE_METADATA(Op.DidRenderLayout, {
  name: 'DidRenderLayout',
  ops: [Register('state')],
  operands: 1
});

/// DEBUGGER ///

OPCODE_METADATA(Op.Debugger, {
  name: 'Debugger',
  ops: [StrArray('symbols'), NumArray('evalInfo')],
  operands: 2
});

//// DOM ///

OPCODE_METADATA(Op.Text, {
  name: 'Text',
  ops: [Str('text')],
  operands: 1
});

OPCODE_METADATA(Op.Comment, {
  name: 'Comment',
  ops: [Str('comment')],
  operands: 1
});

OPCODE_METADATA(Op.DynamicContent, {
  name: 'DynamicContent',
  ops: [Bool('trusting')],
  operands: 1,
  stackChange: -1
});

OPCODE_METADATA(Op.OpenElement, {
  name: 'OpenElement',
  ops: [Str('tag')],
  operands: 1
});

OPCODE_METADATA(Op.OpenElementWithOperations, {
  name: 'OpenElementWithOperations',
  ops: [Str('tag')],
  operands: 1
});

OPCODE_METADATA(Op.OpenDynamicElement, {
  name: 'OpenDynamicElement',
  stackChange: -1
});

OPCODE_METADATA(Op.StaticAttr, {
  name: 'StaticAttr',
  ops: [Str('name'), Str('value'), OptionStr('namespace')],
  operands: 3
});

OPCODE_METADATA(Op.DynamicAttr, {
  name: 'DynamicAttr',
  ops: [Str('name'), Bool('trusting'), OptionStr('namespace')],
  operands: 3,
  stackChange: -1
});

OPCODE_METADATA(Op.ComponentAttr, {
  name: 'ComponentAttr',
  ops: [Str('name'), Bool('trusting'), OptionStr('namespace')],
  operands: 3,
  stackChange: -1
});

OPCODE_METADATA(Op.FlushElement, {
  name: 'FlushElement'
});

OPCODE_METADATA(Op.CloseElement, {
  name: 'CloseElement'
});

/// WORMHOLE ///

OPCODE_METADATA(Op.PushRemoteElement, {
  name: 'PushRemoteElement',
  stackChange: -3
});

OPCODE_METADATA(Op.PopRemoteElement, {
  name: 'PopRemoteElement'
});

/// MODIFIER ///

OPCODE_METADATA(Op.Modifier, {
  name: 'Modifier',
  ops: [Handle('helper')],
  operands: 1,
  stackChange: -1
});

/// VM ///

OPCODE_METADATA(Op.Constant, {
  name: 'Constant',
  ops: [LazyConstant('value')],
  operands: 1,
  stackChange: 1
});

OPCODE_METADATA(Op.Primitive, {
  name: 'Primitive',
  ops: [Primitive('primitive')],
  operands: 1,
  stackChange: 1
});

OPCODE_METADATA(Op.PrimitiveReference, {
  name: 'PrimitiveReference'
});

OPCODE_METADATA(Op.Dup, {
  name: 'Dup',
  ops: [Register('register'), I32('offset')],
  operands: 2,
  stackChange: 1
});

OPCODE_METADATA(Op.Pop, {
  name: 'Pop',
  ops: [I32('count')],
  operands: 1,
  stackChange({ opcode: { op1: count } }) {
    return -count;
  }
});

OPCODE_METADATA(Op.Load, {
  name: 'Load',
  ops: [Register('register')],
  operands: 1,
  stackChange: -1
});

OPCODE_METADATA(Op.Fetch, {
  name: 'Fetch',
  ops: [Register('register')],
  operands: 1,
  stackChange: 1
});

/// EXPRESSIONS ///

OPCODE_METADATA(Op.Helper, {
  name: 'Helper',
  ops: [Handle('helper')],
  operands: 1,
  stackChange: -1
});

OPCODE_METADATA(Op.SetVariable, {
  name: 'SetVariable',
  ops: [ScopeSymbol('symbol')],
  operands: 1,
  stackChange: -1
});

OPCODE_METADATA(Op.SetBlock, {
  name: 'SetBlock',
  ops: [ScopeSymbol('symbol')],
  operands: 1,
  stackChange: -3
});

OPCODE_METADATA(Op.GetVariable, {
  name: 'GetVariable',
  ops: [ScopeSymbol('symbol')],
  operands: 1,
  stackChange: 1
});

OPCODE_METADATA(Op.GetProperty, {
  name: 'GetProperty',
  ops: [Str('key')],
  operands: 1
});

OPCODE_METADATA(Op.GetBlock, {
  name: 'GetBlock',
  ops: [ScopeBlock('block')],
  operands: 1,
  stackChange: 3
});

OPCODE_METADATA(Op.HasBlock, {
  name: 'HasBlock',
  ops: [ScopeBlock('block')],
  operands: 1,
  stackChange: 1
});

OPCODE_METADATA(Op.HasBlockParams, {
  name: 'HasBlockParams',
  ops: [ScopeBlock('block')],
  stackChange: -2
});

OPCODE_METADATA(Op.Concat, {
  name: 'Concat',
  ops: [I32('size')],
  operands: 1,

  stackChange({ opcode }) {
    return -opcode.op1 + 1;
  }
});

/// LIST ///

OPCODE_METADATA(Op.EnterList, {
  name: 'EnterList',
  ops: [I32('start')],
  operands: 1
});

OPCODE_METADATA(Op.ExitList, {
  name: 'ExitList'
});

OPCODE_METADATA(Op.PutIterator, {
  name: 'PutIterator'
});

OPCODE_METADATA(Op.Iterate, {
  name: 'Iterate',
  ops: [I32('end')],
  skipCheck: true
});

/// PARTIAL ///

OPCODE_METADATA(Op.InvokePartial, {
  name: 'InvokePartial',
  ops: [Serializable('meta'), StrArray('symbols'), NumArray('evalInfo')],
  operands: 3,
  stackChange: 1
});

OPCODE_METADATA(Op.ResolveMaybeLocal, {
  name: 'ResolveMaybeLocal',
  operands: 1,
  stackChange: 1
});
