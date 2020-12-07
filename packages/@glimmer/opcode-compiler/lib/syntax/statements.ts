import {
  CompileTimeComponent,
  HighLevelBuilderOpcode,
  HighLevelResolutionOpcode,
  MachineOp,
  Op,
  SexpOpcodes,
  StatementSexpOpcode,
  WellKnownAttrName,
  WellKnownTagName,
  WireFormat,
} from '@glimmer/interfaces';
import { $fp, $sp } from '@glimmer/vm';
import {
  InvokeStaticBlock,
  InvokeStaticBlockWithStack,
  YieldBlock,
} from '../opcode-builder/helpers/blocks';
import { InvokeComponent, InvokeDynamicComponent } from '../opcode-builder/helpers/components';
import { Replayable, ReplayableIf } from '../opcode-builder/helpers/conditional';
import { expr } from '../opcode-builder/helpers/expr';
import { CompilePositional, SimpleArgs } from '../opcode-builder/helpers/shared';
import { Call, DynamicScope, PushPrimitiveReference } from '../opcode-builder/helpers/vm';
import {
  evalSymbolsOperand,
  labelOperand,
  stdlibOperand,
  ownerOperand,
} from '../opcode-builder/operands';
import { Compilers, PushStatementOp } from './compilers';
import {
  isGetFreeComponent,
  isGetFreeComponentOrHelper,
  isGetFreeOptionalComponentOrHelper,
} from '../opcode-builder/helpers/resolution';

export const STATEMENTS = new Compilers<PushStatementOp, StatementSexpOpcode>();

const INFLATE_ATTR_TABLE: {
  [I in WellKnownAttrName]: string;
} = ['class', 'id', 'value', 'name', 'type', 'style', 'href'];
const INFLATE_TAG_TABLE: {
  [I in WellKnownTagName]: string;
} = ['div', 'span', 'p', 'a'];

export function inflateTagName(tagName: string | WellKnownTagName): string {
  return typeof tagName === 'string' ? tagName : INFLATE_TAG_TABLE[tagName];
}

export function inflateAttrName(attrName: string | WellKnownAttrName): string {
  return typeof attrName === 'string' ? attrName : INFLATE_ATTR_TABLE[attrName];
}

STATEMENTS.add(SexpOpcodes.Comment, (op, sexp) => op(Op.Comment, sexp[1]));
STATEMENTS.add(SexpOpcodes.CloseElement, (op) => op(Op.CloseElement));
STATEMENTS.add(SexpOpcodes.FlushElement, (op) => op(Op.FlushElement));

STATEMENTS.add(SexpOpcodes.Modifier, (op, [, expr, positional, named]) => {
  op(HighLevelResolutionOpcode.ResolveModifier, expr, (handle: number) => {
    op(MachineOp.PushFrame);
    SimpleArgs(op, positional, named, false);
    op(Op.Modifier, handle);
    op(MachineOp.PopFrame);
  });
});

STATEMENTS.add(SexpOpcodes.StaticAttr, (op, [, name, value, namespace]) => {
  op(Op.StaticAttr, inflateAttrName(name), value as string, namespace ?? null);
});

STATEMENTS.add(SexpOpcodes.StaticComponentAttr, (op, [, name, value, namespace]) => {
  op(Op.StaticComponentAttr, inflateAttrName(name), value as string, namespace ?? null);
});

STATEMENTS.add(SexpOpcodes.DynamicAttr, (op, [, name, value, namespace]) => {
  expr(op, value);
  op(Op.DynamicAttr, inflateAttrName(name), false, namespace ?? null);
});

STATEMENTS.add(SexpOpcodes.TrustingDynamicAttr, (op, [, name, value, namespace]) => {
  expr(op, value);
  op(Op.DynamicAttr, inflateAttrName(name), true, namespace ?? null);
});

STATEMENTS.add(SexpOpcodes.ComponentAttr, (op, [, name, value, namespace]) => {
  expr(op, value);
  op(Op.ComponentAttr, inflateAttrName(name), false, namespace ?? null);
});

STATEMENTS.add(SexpOpcodes.TrustingComponentAttr, (op, [, name, value, namespace]) => {
  expr(op, value);
  op(Op.ComponentAttr, inflateAttrName(name), true, namespace ?? null);
});

STATEMENTS.add(SexpOpcodes.OpenElement, (op, [, tag]) => {
  op(Op.OpenElement, inflateTagName(tag));
});

STATEMENTS.add(SexpOpcodes.OpenElementWithSplat, (op, [, tag]) => {
  op(Op.PutComponentOperations);
  op(Op.OpenElement, inflateTagName(tag));
});

STATEMENTS.add(SexpOpcodes.Component, (op, [, expr, elementBlock, named, blocks]) => {
  if (isGetFreeComponent(expr)) {
    op(HighLevelResolutionOpcode.ResolveComponent, expr, (component: CompileTimeComponent) => {
      InvokeComponent(op, component, elementBlock, null, named, blocks);
    });
  } else {
    // otherwise, the component name was an expression, so resolve the expression
    // and invoke it as a dynamic component
    InvokeDynamicComponent(op, expr, elementBlock, null, named, blocks, true, true);
  }
});

STATEMENTS.add(SexpOpcodes.Partial, (op, [, name, evalInfo]) => {
  ReplayableIf(
    op,
    () => {
      expr(op, name);
      op(Op.Dup, $sp, 0);

      return 2;
    },

    () => {
      op(Op.InvokePartial, ownerOperand(), evalSymbolsOperand(), evalInfo);
      op(Op.PopScope);
      op(MachineOp.PopFrame);
    }
  );
});

STATEMENTS.add(SexpOpcodes.Yield, (op, [, to, params]) => YieldBlock(op, to, params));

STATEMENTS.add(SexpOpcodes.AttrSplat, (op, [, to]) => YieldBlock(op, to, null));

STATEMENTS.add(SexpOpcodes.Debugger, (op, [, evalInfo]) =>
  op(Op.Debugger, evalSymbolsOperand(), evalInfo)
);

STATEMENTS.add(SexpOpcodes.Append, (op, [, value]) => {
  // Special case for static values
  if (!Array.isArray(value)) {
    op(Op.Text, value === null || value === undefined ? '' : String(value));
  } else if (isGetFreeOptionalComponentOrHelper(value)) {
    op(HighLevelResolutionOpcode.ResolveOptionalComponentOrHelper, value, {
      ifComponent(component: CompileTimeComponent) {
        InvokeComponent(op, component, null, null, null, null);
      },

      ifHelper(handle: number) {
        op(MachineOp.PushFrame);
        Call(op, handle, null, null);
        op(MachineOp.InvokeStatic, stdlibOperand('cautious-append'));
        op(MachineOp.PopFrame);
      },

      ifValue(handle: number) {
        op(MachineOp.PushFrame);
        op(Op.ConstantReference, handle);
        op(MachineOp.InvokeStatic, stdlibOperand('cautious-append'));
        op(MachineOp.PopFrame);
      },

      ifFallback(_name: string) {
        op(MachineOp.PushFrame);
        op(HighLevelResolutionOpcode.ResolveLocal, value[1], (name: string) => {
          op(Op.GetVariable, 0);
          op(Op.GetProperty, name);
        });
        op(MachineOp.InvokeStatic, stdlibOperand('cautious-append'));
        op(MachineOp.PopFrame);
      },
    });
  } else if (value[0] === SexpOpcodes.Call && isGetFreeComponentOrHelper(value[1])) {
    let [, expr, positional, named] = value;

    op(HighLevelResolutionOpcode.ResolveComponentOrHelper, expr, {
      ifComponent(component: CompileTimeComponent) {
        InvokeComponent(op, component, null, positional, hashToArgs(named), null);
      },
      ifHelper(handle: number) {
        op(MachineOp.PushFrame);
        Call(op, handle, positional, named);
        op(MachineOp.InvokeStatic, stdlibOperand('cautious-append'));
        op(MachineOp.PopFrame);
      },
    });
  } else {
    op(MachineOp.PushFrame);
    expr(op, value);
    op(MachineOp.InvokeStatic, stdlibOperand('cautious-append'));
    op(MachineOp.PopFrame);
  }
});

STATEMENTS.add(SexpOpcodes.TrustingAppend, (op, [, value]) => {
  if (!Array.isArray(value)) {
    op(Op.Text, value === null || value === undefined ? '' : String(value));
  } else {
    op(MachineOp.PushFrame);
    expr(op, value);
    op(MachineOp.InvokeStatic, stdlibOperand('trusting-append'));
    op(MachineOp.PopFrame);
  }
});

STATEMENTS.add(SexpOpcodes.Block, (op, [, expr, positional, named, blocks]) => {
  op(HighLevelResolutionOpcode.ResolveComponent, expr, (component: CompileTimeComponent) => {
    InvokeComponent(op, component, null, positional, hashToArgs(named), blocks);
  });
});

STATEMENTS.add(SexpOpcodes.InElement, (op, [, block, guid, destination, insertBefore]) => {
  ReplayableIf(
    op,

    () => {
      expr(op, guid);

      if (insertBefore === undefined) {
        PushPrimitiveReference(op, undefined);
      } else {
        expr(op, insertBefore);
      }

      expr(op, destination);
      op(Op.Dup, $sp, 0);

      return 4;
    },

    () => {
      op(Op.PushRemoteElement);
      InvokeStaticBlock(op, block);
      op(Op.PopRemoteElement);
    }
  );
});

STATEMENTS.add(SexpOpcodes.If, (op, [, condition, block, inverse]) =>
  ReplayableIf(
    op,
    () => {
      expr(op, condition);
      op(Op.ToBoolean);

      return 1;
    },

    () => {
      InvokeStaticBlock(op, block);
    },

    () => {
      if (inverse) {
        InvokeStaticBlock(op, inverse);
      }
    }
  )
);

STATEMENTS.add(SexpOpcodes.Unless, (op, [, condition, block, inverse]) =>
  ReplayableIf(
    op,

    () => {
      expr(op, condition);
      op(Op.ToBoolean);

      return 1;
    },

    () => {
      if (inverse) {
        InvokeStaticBlock(op, inverse);
      }
    },

    () => {
      InvokeStaticBlock(op, block);
    }
  )
);

STATEMENTS.add(SexpOpcodes.Each, (op, [, value, key, block, inverse]) =>
  Replayable(
    op,

    () => {
      if (key) {
        expr(op, key);
      } else {
        PushPrimitiveReference(op, null);
      }

      expr(op, value);

      return 2;
    },

    () => {
      op(Op.EnterList, labelOperand('BODY'), labelOperand('ELSE'));
      op(MachineOp.PushFrame);
      op(Op.Dup, $fp, 1);
      op(MachineOp.ReturnTo, labelOperand('ITER'));
      op(HighLevelBuilderOpcode.Label, 'ITER');
      op(Op.Iterate, labelOperand('BREAK'));
      op(HighLevelBuilderOpcode.Label, 'BODY');
      InvokeStaticBlockWithStack(op, block, 2);
      op(Op.Pop, 2);
      op(MachineOp.Jump, labelOperand('FINALLY'));
      op(HighLevelBuilderOpcode.Label, 'BREAK');
      op(MachineOp.PopFrame);
      op(Op.ExitList);
      op(MachineOp.Jump, labelOperand('FINALLY'));
      op(HighLevelBuilderOpcode.Label, 'ELSE');

      if (inverse) {
        InvokeStaticBlock(op, inverse);
      }
    }
  )
);

STATEMENTS.add(SexpOpcodes.With, (op, [, value, block, inverse]) => {
  ReplayableIf(
    op,

    () => {
      expr(op, value);
      op(Op.Dup, $sp, 0);
      op(Op.ToBoolean);

      return 2;
    },

    () => {
      InvokeStaticBlockWithStack(op, block, 1);
    },

    () => {
      if (inverse) {
        InvokeStaticBlock(op, inverse);
      }
    }
  );
});

STATEMENTS.add(SexpOpcodes.Let, (op, [, positional, block]) => {
  let count = CompilePositional(op, positional);
  InvokeStaticBlockWithStack(op, block, count);
});

STATEMENTS.add(SexpOpcodes.WithDynamicVars, (op, [, named, block]) => {
  if (named) {
    let [names, expressions] = named;

    CompilePositional(op, expressions);
    DynamicScope(op, names, () => {
      InvokeStaticBlock(op, block);
    });
  } else {
    InvokeStaticBlock(op, block);
  }
});

STATEMENTS.add(SexpOpcodes.InvokeComponent, (op, [, expr, positional, named, blocks]) => {
  if (isGetFreeComponent(expr)) {
    op(HighLevelResolutionOpcode.ResolveComponent, expr, (component: CompileTimeComponent) => {
      InvokeComponent(op, component, null, positional, hashToArgs(named), blocks);
    });
  } else {
    InvokeDynamicComponent(op, expr, null, positional, named, blocks, false, false);
  }
});

function hashToArgs(hash: WireFormat.Core.Hash | null): WireFormat.Core.Hash | null {
  if (hash === null) return null;
  let names = hash[0].map((key) => `@${key}`);
  return [names as [string, ...string[]], hash[1]];
}
