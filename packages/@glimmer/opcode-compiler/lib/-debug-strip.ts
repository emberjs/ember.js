import { Op } from "@glimmer/vm";
import { Option, Opaque, Opcode } from "@glimmer/interfaces";
import { RuntimeConstants } from "@glimmer/program";
import { fillNulls } from "@glimmer/util";
import { check, CheckNumber, CheckInterface } from "@glimmer/debug";

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

export interface DebugMetadata<State = undefined> {
  before?: (opcode: Opcode, vm: VM) => State;
  stackChange?: DebugStackChangeFunction<State> | number;
  operands?: OperandSize;
}

export interface NormalizedMetadata {
  before: Option<DebugBeforeFunction>;
  stackChange: DebugStackChangeFunction<Opaque>;
  operands: OperandSize;
}

// Once all opcodes are annotated, this can be the default. For now, make sure
// we actually annotated all of them before trying to use the metadata in
// assertions
const DEFAULT_METADATA = {
  stackChange: 0,
  operands: 0 as 0
};

export const METADATA: Option<NormalizedMetadata>[] = fillNulls(Op.Size);

export function OPCODE_METADATA<State, Name extends Op = Op>(name: Name, metadata: DebugMetadata<State> = DEFAULT_METADATA): void {
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

  let normalized: NormalizedMetadata = {
    before,
    stackChange,
    operands
  };

  METADATA[name as number] = normalized;
}

/// helpers ///

interface ClearsArgs {
  operands?: OperandSize;

  /**
   * net pushes, not including popping ARGS
   */
  netPushes?: number;

  /**
   * net pops, not including popping ARGS
   */
  netPops?: number;

  argsPosition?: number;
}

function clearsArgs(options: ClearsArgs): DebugMetadata<number> {
  let providedOperands: OperandSize = options.operands || 0;

  return {
    operands: providedOperands,

    before(_opcode: Opaque, vm: VM): number {
      return check(vm.stack.peek(options.argsPosition || 0), CheckInterface({ length: CheckNumber })).length;
    },

    stackChange({ state: args }: { state: number }): number {
      return -args - 1 + (options.netPushes || 0) - (options.netPops || 0);
    }
  };
}

/// VM ///

OPCODE_METADATA(Op.ChildScope);

OPCODE_METADATA(Op.PopScope);

OPCODE_METADATA(Op.PushDynamicScope);

OPCODE_METADATA(Op.PopDynamicScope);

OPCODE_METADATA(Op.Constant, {
  operands: 1,
  stackChange: 1
});

OPCODE_METADATA(Op.Primitive, {
  operands: 1,
  stackChange: 1
});

OPCODE_METADATA(Op.PrimitiveReference);

OPCODE_METADATA(Op.Dup, {
  operands: 2,
  stackChange: 1
});

OPCODE_METADATA(Op.Pop, {
  operands: 1,
  stackChange({ opcode: { op1: count } }) {
    return -count;
  }
});

OPCODE_METADATA(Op.Load, {
  operands: 1,
  stackChange: -1
});

OPCODE_METADATA(Op.Fetch, {
  operands: 1,
  stackChange: 1
});

OPCODE_METADATA(Op.BindDynamicScope, {
  operands: 1,
  stackChange({ opcode: { op1: _names }, constants }) {
    let size = constants.getArray(_names).length;

    return -size;
  }
});

OPCODE_METADATA(Op.PushFrame, {
  operands: 0,
  stackChange: 2
});

OPCODE_METADATA(Op.PopFrame, {
  before(_opcode: Opcode, vm: VM): { sp: number, fp: number } {
    return { sp: vm.stack.sp, fp: vm.stack.fp };
  },

  stackChange({ state }: { state: { sp: number, fp: number } }) {
    return state.fp - state.sp - 1;
  }
});

OPCODE_METADATA(Op.Enter, {
  operands: 1
});

OPCODE_METADATA(Op.Exit, {
  stackChange: 0
});

OPCODE_METADATA(Op.PushSymbolTable, {
  operands: 1,
  stackChange: 1
});

OPCODE_METADATA(Op.CompileBlock, {
  stackChange: 0
});

OPCODE_METADATA(Op.InvokeVirtual, {
  stackChange: -1
});

OPCODE_METADATA(Op.InvokeStatic, {
  operands: 1
});

OPCODE_METADATA(Op.InvokeYield, clearsArgs({
  argsPosition: 2
}));

OPCODE_METADATA(Op.Jump, {
  operands: 1
});

OPCODE_METADATA(Op.JumpIf, {
  operands: 1,
  stackChange: -1
});

OPCODE_METADATA(Op.JumpUnless, {
  operands: 1,
  stackChange: -1
});

OPCODE_METADATA(Op.Return);

OPCODE_METADATA(Op.ReturnTo, {
  operands: 1
});

OPCODE_METADATA(Op.ToBoolean);
/// COMPONENTS ///

OPCODE_METADATA(Op.IsComponent);

OPCODE_METADATA(Op.CurryComponent, clearsArgs({
  operands: 0
}));

OPCODE_METADATA(Op.PushComponentSpec, {
  operands: 1,
  stackChange: 1,
});

OPCODE_METADATA(Op.PushDynamicComponentManager, {
  operands: 1
});

OPCODE_METADATA(Op.PushArgs, {
  operands: 3,
  stackChange: 1
});

OPCODE_METADATA(Op.CreateComponent, {
  operands: 2
});

OPCODE_METADATA(Op.RegisterComponentDestructor, {
  operands: 1
});

OPCODE_METADATA(Op.BeginComponentTransaction);

OPCODE_METADATA(Op.PutComponentOperations);

OPCODE_METADATA(Op.ComponentAttr, {
  operands: 3,
  stackChange: -1
});

OPCODE_METADATA(Op.DidCreateElement, {
  operands: 1
});

OPCODE_METADATA(Op.GetComponentSelf, {
  operands: 1,
  stackChange: 1
});

OPCODE_METADATA(Op.GetComponentTagName, {
  operands: 1,
  stackChange: 1
});

OPCODE_METADATA(Op.GetComponentLayout, {
  operands: 1,
  stackChange: 2
});

OPCODE_METADATA(Op.DidRenderLayout, {
  operands: 1
});

OPCODE_METADATA(Op.CommitComponentTransaction);

/// DYNAMIC CONTENT ///

OPCODE_METADATA(Op.DynamicContent, {
  operands: 1,
  stackChange: -1
});

/// DEBUGGER ///

OPCODE_METADATA(Op.Debugger, {
  operands: 2
});

//// DOM ///

OPCODE_METADATA(Op.Text, {
  operands: 1
});

OPCODE_METADATA(Op.OpenElementWithOperations, {
  operands: 1
});

OPCODE_METADATA(Op.Comment, {
  operands: 1
});

OPCODE_METADATA(Op.OpenElement, {
  operands: 1
});

OPCODE_METADATA(Op.OpenDynamicElement, {
  stackChange: -1
});

OPCODE_METADATA(Op.PushRemoteElement, {
  stackChange: -2
});

OPCODE_METADATA(Op.PopRemoteElement);

OPCODE_METADATA(Op.FlushElement);

OPCODE_METADATA(Op.CloseElement);

OPCODE_METADATA(Op.StaticAttr, {
  operands: 3
});

OPCODE_METADATA(Op.DynamicAttr, {
  operands: 3,
  stackChange: -1
});

/// EXPRESSIONS ///

OPCODE_METADATA(Op.Helper, clearsArgs({
  operands: 1,
  netPushes: 1
}));

OPCODE_METADATA(Op.GetVariable, {
  operands: 1,
  stackChange: 1
});

OPCODE_METADATA(Op.SetVariable, {
  operands: 1,
  stackChange: -1
});

OPCODE_METADATA(Op.GetBlock, {
  operands: 1,
  stackChange: 2
});

OPCODE_METADATA(Op.SetBlock, {
  operands: 1,
  stackChange: -2
});

OPCODE_METADATA(Op.ResolveMaybeLocal, {
  operands: 1,
  stackChange: 1
});

OPCODE_METADATA(Op.RootScope, {
  operands: 2
});

OPCODE_METADATA(Op.GetProperty, {
  operands: 1
});

OPCODE_METADATA(Op.HasBlock, {
  operands: 1,
  stackChange: 1
});

OPCODE_METADATA(Op.HasBlockParams, {
  stackChange: -1
});

OPCODE_METADATA(Op.Concat, {
  operands: 1,

  stackChange({ opcode }) {
    return -opcode.op1 + 1;
  }
});

/// LIST ///

OPCODE_METADATA(Op.PutIterator);

OPCODE_METADATA(Op.EnterList, {
  operands: 1
});

OPCODE_METADATA(Op.ExitList);

/// PARTIAL ///

OPCODE_METADATA(Op.InvokePartial, {
  operands: 3,
  stackChange: 1
});
