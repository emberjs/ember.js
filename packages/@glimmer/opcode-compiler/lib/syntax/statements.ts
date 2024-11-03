import type {
  CompileTimeComponent,
  StatementSexpOpcode,
  WellKnownAttrName,
  WellKnownTagName,
  WireFormat,
} from '@glimmer/interfaces';
import {
  VM_INVOKE_STATIC_OP,
  VM_JUMP_OP,
  VM_POP_FRAME_OP,
  VM_PUSH_FRAME_OP,
  VM_RETURN_TO_OP,
} from '@glimmer/constants';
import { $fp, $sp, ContentType, Op } from '@glimmer/vm';
import { SexpOpcodes } from '@glimmer/wire-format';

import type { PushStatementOp } from './compilers';

import {
  InvokeStaticBlock,
  InvokeStaticBlockWithStack,
  YieldBlock,
} from '../opcode-builder/helpers/blocks';
import {
  InvokeComponent,
  InvokeDynamicComponent,
  InvokeNonStaticComponent,
} from '../opcode-builder/helpers/components';
import { Replayable, ReplayableIf, SwitchCases } from '../opcode-builder/helpers/conditional';
import { expr } from '../opcode-builder/helpers/expr';
import {
  isGetFreeComponent,
  isGetFreeComponentOrHelper,
  isGetFreeModifier,
} from '../opcode-builder/helpers/resolution';
import { CompilePositional, SimpleArgs } from '../opcode-builder/helpers/shared';
import {
  Call,
  CallDynamic,
  DynamicScope,
  PushPrimitiveReference,
} from '../opcode-builder/helpers/vm';
import { HighLevelBuilderOpcodes, HighLevelResolutionOpcodes } from '../opcode-builder/opcodes';
import { debugSymbolsOperand, labelOperand, stdlibOperand } from '../opcode-builder/operands';
import { namedBlocks } from '../utils';
import { Compilers } from './compilers';

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

STATEMENTS.add(SexpOpcodes.Modifier, (op, [, expression, positional, named]) => {
  if (isGetFreeModifier(expression)) {
    op(HighLevelResolutionOpcodes.Modifier, expression, (handle: number) => {
      op(VM_PUSH_FRAME_OP);
      SimpleArgs(op, positional, named, false);
      op(Op.Modifier, handle);
      op(VM_POP_FRAME_OP);
    });
  } else {
    expr(op, expression);
    op(VM_PUSH_FRAME_OP);
    SimpleArgs(op, positional, named, false);
    op(Op.Dup, $fp, 1);
    op(Op.DynamicModifier);
    op(VM_POP_FRAME_OP);
  }
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
    op(HighLevelResolutionOpcodes.Component, expr, (component: CompileTimeComponent) => {
      InvokeComponent(op, component, elementBlock, null, named, blocks);
    });
  } else {
    // otherwise, the component name was an expression, so resolve the expression
    // and invoke it as a dynamic component
    InvokeDynamicComponent(op, expr, elementBlock, null, named, blocks, true, true);
  }
});

STATEMENTS.add(SexpOpcodes.Yield, (op, [, to, params]) => YieldBlock(op, to, params));

STATEMENTS.add(SexpOpcodes.AttrSplat, (op, [, to]) => YieldBlock(op, to, null));

STATEMENTS.add(SexpOpcodes.Debugger, (op, [, debugInfo]) =>
  op(Op.Debugger, debugSymbolsOperand(), debugInfo)
);

STATEMENTS.add(SexpOpcodes.Append, (op, [, value]) => {
  // Special case for static values
  if (!Array.isArray(value)) {
    op(Op.Text, value === null || value === undefined ? '' : String(value));
  } else if (isGetFreeComponentOrHelper(value)) {
    op(HighLevelResolutionOpcodes.OptionalComponentOrHelper, value, {
      ifComponent(component: CompileTimeComponent) {
        InvokeComponent(op, component, null, null, null, null);
      },

      ifHelper(handle: number) {
        op(VM_PUSH_FRAME_OP);
        Call(op, handle, null, null);
        op(VM_INVOKE_STATIC_OP, stdlibOperand('cautious-non-dynamic-append'));
        op(VM_POP_FRAME_OP);
      },

      ifValue(handle: number) {
        op(VM_PUSH_FRAME_OP);
        op(Op.ConstantReference, handle);
        op(VM_INVOKE_STATIC_OP, stdlibOperand('cautious-non-dynamic-append'));
        op(VM_POP_FRAME_OP);
      },
    });
  } else if (value[0] === SexpOpcodes.Call) {
    let [, expression, positional, named] = value;

    if (isGetFreeComponentOrHelper(expression)) {
      op(HighLevelResolutionOpcodes.ComponentOrHelper, expression, {
        ifComponent(component: CompileTimeComponent) {
          InvokeComponent(op, component, null, positional, hashToArgs(named), null);
        },
        ifHelper(handle: number) {
          op(VM_PUSH_FRAME_OP);
          Call(op, handle, positional, named);
          op(VM_INVOKE_STATIC_OP, stdlibOperand('cautious-non-dynamic-append'));
          op(VM_POP_FRAME_OP);
        },
      });
    } else {
      SwitchCases(
        op,
        () => {
          expr(op, expression);
          op(Op.DynamicContentType);
        },
        (when) => {
          when(ContentType.Component, () => {
            op(Op.ResolveCurriedComponent);
            op(Op.PushDynamicComponentInstance);
            InvokeNonStaticComponent(op, {
              capabilities: true,
              elementBlock: null,
              positional,
              named,
              atNames: false,
              blocks: namedBlocks(null),
            });
          });

          when(ContentType.Helper, () => {
            CallDynamic(op, positional, named, () => {
              op(VM_INVOKE_STATIC_OP, stdlibOperand('cautious-non-dynamic-append'));
            });
          });
        }
      );
    }
  } else {
    op(VM_PUSH_FRAME_OP);
    expr(op, value);
    op(VM_INVOKE_STATIC_OP, stdlibOperand('cautious-append'));
    op(VM_POP_FRAME_OP);
  }
});

STATEMENTS.add(SexpOpcodes.TrustingAppend, (op, [, value]) => {
  if (!Array.isArray(value)) {
    op(Op.Text, value === null || value === undefined ? '' : String(value));
  } else {
    op(VM_PUSH_FRAME_OP);
    expr(op, value);
    op(VM_INVOKE_STATIC_OP, stdlibOperand('trusting-append'));
    op(VM_POP_FRAME_OP);
  }
});

STATEMENTS.add(SexpOpcodes.Block, (op, [, expr, positional, named, blocks]) => {
  if (isGetFreeComponent(expr)) {
    op(HighLevelResolutionOpcodes.Component, expr, (component: CompileTimeComponent) => {
      InvokeComponent(op, component, null, positional, hashToArgs(named), blocks);
    });
  } else {
    InvokeDynamicComponent(op, expr, null, positional, named, blocks, false, false);
  }
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

    inverse
      ? () => {
          InvokeStaticBlock(op, inverse);
        }
      : undefined
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
      op(VM_PUSH_FRAME_OP);
      op(Op.Dup, $fp, 1);
      op(VM_RETURN_TO_OP, labelOperand('ITER'));
      op(HighLevelBuilderOpcodes.Label, 'ITER');
      op(Op.Iterate, labelOperand('BREAK'));
      op(HighLevelBuilderOpcodes.Label, 'BODY');
      InvokeStaticBlockWithStack(op, block, 2);
      op(Op.Pop, 2);
      op(VM_JUMP_OP, labelOperand('FINALLY'));
      op(HighLevelBuilderOpcodes.Label, 'BREAK');
      op(VM_POP_FRAME_OP);
      op(Op.ExitList);
      op(VM_JUMP_OP, labelOperand('FINALLY'));
      op(HighLevelBuilderOpcodes.Label, 'ELSE');

      if (inverse) {
        InvokeStaticBlock(op, inverse);
      }
    }
  )
);

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
    op(HighLevelResolutionOpcodes.Component, expr, (component: CompileTimeComponent) => {
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
