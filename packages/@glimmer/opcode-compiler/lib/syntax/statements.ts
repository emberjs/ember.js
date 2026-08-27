import type {
  CompileTimeComponent,
  WellKnownAttrName,
  WellKnownTagName,
  WireFormat,
} from '@glimmer/interfaces';
import {
  COMPONENT_ATTR_OP,
  PUSH_DYNAMIC_COMPONENT_INSTANCE_OP,
  PUT_COMPONENT_OPERATIONS_OP,
  RESOLVE_CURRIED_COMPONENT_OP,
  STATIC_COMPONENT_ATTR_OP,
} from '@glimmer/runtime/lib/compiled/opcodes/component';
import { DYNAMIC_CONTENT_TYPE_OP } from '@glimmer/runtime/lib/compiled/opcodes/content';
import { DEBUGGER_OP } from '@glimmer/runtime/lib/compiled/opcodes/debugger';
import {
  CLOSE_ELEMENT_OP,
  COMMENT_OP,
  DYNAMIC_ATTR_OP,
  DYNAMIC_MODIFIER_OP,
  FLUSH_ELEMENT_OP,
  MODIFIER_OP,
  OPEN_ELEMENT_OP,
  POP_REMOTE_ELEMENT_OP,
  PUSH_REMOTE_ELEMENT_OP,
  STATIC_ATTR_OP,
  TEXT_OP,
} from '@glimmer/runtime/lib/compiled/opcodes/dom';
import {
  ENTER_LIST_OP,
  EXIT_LIST_OP,
  ITERATE_OP,
} from '@glimmer/runtime/lib/compiled/opcodes/lists';
import {
  ASSERT_SAME_OP,
  CONSTANT_REFERENCE_OP,
  DUP_OP,
  POP_OP,
  TO_BOOLEAN_OP,
} from '@glimmer/runtime/lib/compiled/opcodes/vm';
import {
  VM_INVOKE_STATIC_OP,
  VM_JUMP_OP,
  VM_POP_FRAME_OP,
  VM_PUSH_FRAME_OP,
  VM_RETURN_TO_OP,
} from '@glimmer/constants/lib/vm-ops';
import { $fp, $sp } from '@glimmer/vm/lib/registers';
import { ContentType } from '@glimmer/vm/lib/content';
import { opcodes as SexpOpcodes } from '@glimmer/wire-format/lib/opcodes';

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
  ResolveComponent,
  ResolveComponentOrHelper,
  ResolveModifier,
  ResolveOptionalComponentOrHelper,
} from '../opcode-builder/helpers/resolution';
import { CompilePositional, SimpleArgs } from '../opcode-builder/helpers/shared';
import {
  CAUTIOUS_APPEND,
  CAUTIOUS_NON_DYNAMIC_APPEND,
  TRUSTING_APPEND,
} from '../opcode-builder/helpers/stdlib';
import {
  Call,
  CallDynamic,
  DynamicScope,
  PushPrimitiveReference,
} from '../opcode-builder/helpers/vm';
import { HighLevelBuilderOpcodes } from '../opcode-builder/opcodes';
import { debugSymbolsOperand, labelOperand, stdlibOperand } from '../opcode-builder/operands';
import { namedBlocks } from '../utils';
import { defineStatement, headId } from './compilers';

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

export const CommentOp = /*#__PURE__*/ defineStatement(SexpOpcodes.Comment, (op, sexp) =>
  op(COMMENT_OP, sexp[1])
);
export const CloseElementOp = /*#__PURE__*/ defineStatement(SexpOpcodes.CloseElement, (op) =>
  op(CLOSE_ELEMENT_OP)
);
export const FlushElementOp = /*#__PURE__*/ defineStatement(SexpOpcodes.FlushElement, (op) =>
  op(FLUSH_ELEMENT_OP)
);

export const ModifierOp = /*#__PURE__*/ defineStatement(
  SexpOpcodes.Modifier,
  (op, [, expression, positional, named]) => {
    if (isGetFreeModifier(expression)) {
      op(ResolveModifier, expression, (handle: number) => {
        op(VM_PUSH_FRAME_OP);
        SimpleArgs(op, positional, named, false);
        op(MODIFIER_OP, handle);
        op(VM_POP_FRAME_OP);
      });
    } else {
      expr(op, expression);
      op(VM_PUSH_FRAME_OP);
      SimpleArgs(op, positional, named, false);
      op(DUP_OP, $fp, 1);
      op(DYNAMIC_MODIFIER_OP);
      op(VM_POP_FRAME_OP);
    }
  }
);

export const StaticAttrOp = /*#__PURE__*/ defineStatement(
  SexpOpcodes.StaticAttr,
  (op, [, name, value, namespace]) => {
    op(STATIC_ATTR_OP, inflateAttrName(name), value as string, namespace ?? null);
  }
);

export const StaticComponentAttrOp = /*#__PURE__*/ defineStatement(
  SexpOpcodes.StaticComponentAttr,
  (op, [, name, value, namespace]) => {
    op(STATIC_COMPONENT_ATTR_OP, inflateAttrName(name), value as string, namespace ?? null);
  }
);

export const DynamicAttrOp = /*#__PURE__*/ defineStatement(
  SexpOpcodes.DynamicAttr,
  (op, [, name, value, namespace]) => {
    expr(op, value);
    op(DYNAMIC_ATTR_OP, inflateAttrName(name), false, namespace ?? null);
  }
);

export const TrustingDynamicAttrOp = /*#__PURE__*/ defineStatement(
  SexpOpcodes.TrustingDynamicAttr,
  (op, [, name, value, namespace]) => {
    expr(op, value);
    op(DYNAMIC_ATTR_OP, inflateAttrName(name), true, namespace ?? null);
  }
);

export const ComponentAttrOp = /*#__PURE__*/ defineStatement(
  SexpOpcodes.ComponentAttr,
  (op, [, name, value, namespace]) => {
    expr(op, value);
    op(COMPONENT_ATTR_OP, inflateAttrName(name), false, namespace ?? null);
  }
);

export const TrustingComponentAttrOp = /*#__PURE__*/ defineStatement(
  SexpOpcodes.TrustingComponentAttr,
  (op, [, name, value, namespace]) => {
    expr(op, value);
    op(COMPONENT_ATTR_OP, inflateAttrName(name), true, namespace ?? null);
  }
);

export const OpenElementOp = /*#__PURE__*/ defineStatement(
  SexpOpcodes.OpenElement,
  (op, [, tag]) => {
    op(OPEN_ELEMENT_OP, inflateTagName(tag));
  }
);

export const OpenElementWithSplatOp = /*#__PURE__*/ defineStatement(
  SexpOpcodes.OpenElementWithSplat,
  (op, [, tag]) => {
    op(PUT_COMPONENT_OPERATIONS_OP);
    op(OPEN_ELEMENT_OP, inflateTagName(tag));
  }
);

export const ComponentOp = /*#__PURE__*/ defineStatement(
  SexpOpcodes.Component,
  (op, [, expr, elementBlock, named, blocks]) => {
    if (isGetFreeComponent(expr)) {
      op(ResolveComponent, expr, (component: CompileTimeComponent) => {
        InvokeComponent(op, component, elementBlock, null, named, blocks);
      });
    } else {
      // otherwise, the component name was an expression, so resolve the expression
      // and invoke it as a dynamic component
      InvokeDynamicComponent(op, expr, elementBlock, null, named, blocks, true, true);
    }
  }
);

export const YieldOp = /*#__PURE__*/ defineStatement(SexpOpcodes.Yield, (op, [, to, params]) =>
  YieldBlock(op, to, params)
);

export const AttrSplatOp = /*#__PURE__*/ defineStatement(SexpOpcodes.AttrSplat, (op, [, to]) =>
  YieldBlock(op, to, null)
);

export const DebuggerOp = /*#__PURE__*/ defineStatement(
  SexpOpcodes.Debugger,
  (op, [, locals, upvars, lexical]) => {
    op(DEBUGGER_OP, debugSymbolsOperand(locals, upvars, lexical));
  }
);

/**
 * `{{"literal"}}` or `{{123}}`. The printer picks this op when the appended
 * value is a primitive, so a template with only static content does not pull
 * in the dynamic append routines.
 */
export const AppendStaticOp = /*#__PURE__*/ defineStatement(
  SexpOpcodes.Append,
  (op, [, value]) => {
    op(TEXT_OP, value === null || value === undefined ? '' : String(value));
  },
  { variant: true }
);

export const AppendOp = /*#__PURE__*/ defineStatement(SexpOpcodes.Append, (op, [, value]) => {
  // Special case for static values
  if (!Array.isArray(value)) {
    op(TEXT_OP, value === null || value === undefined ? '' : String(value));
  } else if (isGetFreeComponentOrHelper(value)) {
    op(ResolveOptionalComponentOrHelper, value, {
      ifComponent(component: CompileTimeComponent) {
        InvokeComponent(op, component, null, null, null, null);
      },

      ifHelper(handle: number) {
        op(VM_PUSH_FRAME_OP);
        Call(op, handle, null, null);
        op(VM_INVOKE_STATIC_OP, stdlibOperand(CAUTIOUS_NON_DYNAMIC_APPEND));
        op(VM_POP_FRAME_OP);
      },

      ifValue(handle: number) {
        op(VM_PUSH_FRAME_OP);
        op(CONSTANT_REFERENCE_OP, handle);
        op(VM_INVOKE_STATIC_OP, stdlibOperand(CAUTIOUS_NON_DYNAMIC_APPEND));
        op(VM_POP_FRAME_OP);
      },
    });
  } else if (headId(value) === SexpOpcodes.Call) {
    let [, expression, positional, named] = value as WireFormat.Expressions.Helper;

    if (isGetFreeComponentOrHelper(expression)) {
      op(ResolveComponentOrHelper, expression, {
        ifComponent(component: CompileTimeComponent) {
          InvokeComponent(op, component, null, positional, hashToArgs(named), null);
        },
        ifHelper(handle: number) {
          op(VM_PUSH_FRAME_OP);
          Call(op, handle, positional, named);
          op(VM_INVOKE_STATIC_OP, stdlibOperand(CAUTIOUS_NON_DYNAMIC_APPEND));
          op(VM_POP_FRAME_OP);
        },
      });
    } else {
      SwitchCases(
        op,
        () => {
          expr(op, expression);
          op(DYNAMIC_CONTENT_TYPE_OP);
        },
        (when) => {
          when(ContentType.Component, () => {
            op(ASSERT_SAME_OP);
            op(RESOLVE_CURRIED_COMPONENT_OP);
            op(PUSH_DYNAMIC_COMPONENT_INSTANCE_OP);
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
              op(VM_INVOKE_STATIC_OP, stdlibOperand(CAUTIOUS_NON_DYNAMIC_APPEND));
            });
          });
        }
      );
    }
  } else {
    op(VM_PUSH_FRAME_OP);
    expr(op, value);
    op(VM_INVOKE_STATIC_OP, stdlibOperand(CAUTIOUS_APPEND));
    op(VM_POP_FRAME_OP);
  }
});

export const TrustingAppendOp = /*#__PURE__*/ defineStatement(
  SexpOpcodes.TrustingAppend,
  (op, [, value]) => {
    if (!Array.isArray(value)) {
      op(TEXT_OP, value === null || value === undefined ? '' : String(value));
    } else {
      op(VM_PUSH_FRAME_OP);
      expr(op, value);
      op(VM_INVOKE_STATIC_OP, stdlibOperand(TRUSTING_APPEND));
      op(VM_POP_FRAME_OP);
    }
  }
);

export const BlockOp = /*#__PURE__*/ defineStatement(
  SexpOpcodes.Block,
  (op, [, expr, positional, named, blocks]) => {
    if (isGetFreeComponent(expr)) {
      op(ResolveComponent, expr, (component: CompileTimeComponent) => {
        InvokeComponent(op, component, null, positional, hashToArgs(named), blocks);
      });
    } else {
      InvokeDynamicComponent(op, expr, null, positional, named, blocks, false, false);
    }
  }
);

export const InElementOp = /*#__PURE__*/ defineStatement(
  SexpOpcodes.InElement,
  (op, [, block, guid, destination, insertBefore]) => {
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
        op(DUP_OP, $sp, 0);

        return 4;
      },

      () => {
        op(PUSH_REMOTE_ELEMENT_OP);
        InvokeStaticBlock(op, block);
        op(POP_REMOTE_ELEMENT_OP);
      }
    );
  }
);

export const IfOp = /*#__PURE__*/ defineStatement(
  SexpOpcodes.If,
  (op, [, condition, block, inverse]) =>
    ReplayableIf(
      op,
      () => {
        expr(op, condition);
        op(TO_BOOLEAN_OP);

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

export const EachOp = /*#__PURE__*/ defineStatement(
  SexpOpcodes.Each,
  (op, [, value, key, block, inverse]) =>
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
        op(ENTER_LIST_OP, labelOperand('BODY'), labelOperand('ELSE'));
        op(VM_PUSH_FRAME_OP);
        op(DUP_OP, $fp, 1);
        op(VM_RETURN_TO_OP, labelOperand('ITER'));
        op(HighLevelBuilderOpcodes.Label, 'ITER');
        op(ITERATE_OP, labelOperand('BREAK'));
        op(HighLevelBuilderOpcodes.Label, 'BODY');
        InvokeStaticBlockWithStack(op, block, 2);
        op(POP_OP, 2);
        op(VM_JUMP_OP, labelOperand('FINALLY'));
        op(HighLevelBuilderOpcodes.Label, 'BREAK');
        op(VM_POP_FRAME_OP);
        op(EXIT_LIST_OP);
        op(VM_JUMP_OP, labelOperand('FINALLY'));
        op(HighLevelBuilderOpcodes.Label, 'ELSE');

        if (inverse) {
          InvokeStaticBlock(op, inverse);
        }
      }
    )
);

export const LetOp = /*#__PURE__*/ defineStatement(SexpOpcodes.Let, (op, [, positional, block]) => {
  let count = CompilePositional(op, positional);
  InvokeStaticBlockWithStack(op, block, count);
});

export const WithDynamicVarsOp = /*#__PURE__*/ defineStatement(
  SexpOpcodes.WithDynamicVars,
  (op, [, named, block]) => {
    if (named) {
      let [names, expressions] = named;

      CompilePositional(op, expressions);
      DynamicScope(op, names, () => {
        InvokeStaticBlock(op, block);
      });
    } else {
      InvokeStaticBlock(op, block);
    }
  }
);

export const InvokeComponentOp = /*#__PURE__*/ defineStatement(
  SexpOpcodes.InvokeComponent,
  (op, [, expr, positional, named, blocks]) => {
    if (isGetFreeComponent(expr)) {
      op(ResolveComponent, expr, (component: CompileTimeComponent) => {
        InvokeComponent(op, component, null, positional, hashToArgs(named), blocks);
      });
    } else {
      InvokeDynamicComponent(op, expr, null, positional, named, blocks, false, false);
    }
  }
);

function hashToArgs(hash: WireFormat.Core.Hash | null): WireFormat.Core.Hash | null {
  if (hash === null) return null;
  let names = hash[0].map((key) => `@${key}`);
  return [names as [string, ...string[]], hash[1]];
}
