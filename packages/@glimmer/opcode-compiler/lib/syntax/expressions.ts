import type { ExpressionSexpOpcode } from '@glimmer/interfaces';
import {
  VM_COMPILE_BLOCK_OP,
  VM_CONCAT_OP,
  VM_CONSTANT_REFERENCE_OP,
  VM_FETCH_OP,
  VM_GET_DYNAMIC_VAR_OP,
  VM_GET_PROPERTY_OP,
  VM_GET_VARIABLE_OP,
  VM_HAS_BLOCK_OP,
  VM_HAS_BLOCK_PARAMS_OP,
  VM_IF_INLINE_OP,
  VM_INVOKABLE_REFERENCE_OP,
  VM_LOG_OP,
  VM_NOT_OP,
  VM_POP_FRAME_OP,
  VM_PUSH_FRAME_OP,
  VM_SPREAD_BLOCK_OP,
} from '@glimmer/constants';
import { $v0 } from '@glimmer/vm';
import { SexpOpcodes } from '@glimmer/wire-format';

import type { PushExpressionOp } from './compilers';

import { expr } from '../opcode-builder/helpers/expr';
import { isGetFreeHelper } from '../opcode-builder/helpers/resolution';
import { SimpleArgs } from '../opcode-builder/helpers/shared';
import { Call, CallDynamic, Curry, PushPrimitiveReference } from '../opcode-builder/helpers/vm';
import { HighLevelResolutionOpcodes } from '../opcode-builder/opcodes';
import { Compilers } from './compilers';

export const EXPRESSIONS = new Compilers<PushExpressionOp, ExpressionSexpOpcode>();

EXPRESSIONS.add(SexpOpcodes.Concat, (op, [, parts]) => {
  for (let part of parts) {
    expr(op, part);
  }

  op(VM_CONCAT_OP, parts.length);
});

EXPRESSIONS.add(SexpOpcodes.Call, (op, [, expression, positional, named]) => {
  if (isGetFreeHelper(expression)) {
    op(HighLevelResolutionOpcodes.Helper, expression, (handle: number) => {
      Call(op, handle, positional, named);
    });
  } else {
    expr(op, expression);
    op(VM_INVOKABLE_REFERENCE_OP);
    CallDynamic(op, positional, named);
  }
});

EXPRESSIONS.add(SexpOpcodes.Curry, (op, [, expr, type, positional, named]) => {
  Curry(op, type, expr, positional, named);
});

EXPRESSIONS.add(SexpOpcodes.GetSymbol, (op, [, sym, path]) => {
  op(VM_GET_VARIABLE_OP, sym);
  withPath(op, path);
});

EXPRESSIONS.add(SexpOpcodes.GetLexicalSymbol, (op, [, sym, path]) => {
  op(HighLevelResolutionOpcodes.TemplateLocal, sym, (handle: number) => {
    op(VM_CONSTANT_REFERENCE_OP, handle);
    withPath(op, path);
  });
});

EXPRESSIONS.add(SexpOpcodes.GetStrictKeyword, (op, expr) => {
  op(HighLevelResolutionOpcodes.Local, expr[1], (_name: string) => {
    op(HighLevelResolutionOpcodes.Helper, expr, (handle: number) => {
      Call(op, handle, null, null);
    });
  });
});

EXPRESSIONS.add(SexpOpcodes.GetFreeAsHelperHead, (op, expr) => {
  op(HighLevelResolutionOpcodes.Local, expr[1], (_name: string) => {
    op(HighLevelResolutionOpcodes.Helper, expr, (handle: number) => {
      Call(op, handle, null, null);
    });
  });
});

function withPath(op: PushExpressionOp, path?: string[]) {
  if (path === undefined || path.length === 0) return;

  for (let i = 0; i < path.length; i++) {
    op(VM_GET_PROPERTY_OP, path[i]);
  }
}

EXPRESSIONS.add(SexpOpcodes.Undefined, (op) => PushPrimitiveReference(op, undefined));
EXPRESSIONS.add(SexpOpcodes.HasBlock, (op, [, block]) => {
  expr(op, block);
  op(VM_HAS_BLOCK_OP);
});

EXPRESSIONS.add(SexpOpcodes.HasBlockParams, (op, [, block]) => {
  expr(op, block);
  op(VM_SPREAD_BLOCK_OP);
  op(VM_COMPILE_BLOCK_OP);
  op(VM_HAS_BLOCK_PARAMS_OP);
});

EXPRESSIONS.add(SexpOpcodes.IfInline, (op, [, condition, truthy, falsy]) => {
  // Push in reverse order
  expr(op, falsy);
  expr(op, truthy);
  expr(op, condition);
  op(VM_IF_INLINE_OP);
});

EXPRESSIONS.add(SexpOpcodes.Not, (op, [, value]) => {
  expr(op, value);
  op(VM_NOT_OP);
});

EXPRESSIONS.add(SexpOpcodes.GetDynamicVar, (op, [, expression]) => {
  expr(op, expression);
  op(VM_GET_DYNAMIC_VAR_OP);
});

EXPRESSIONS.add(SexpOpcodes.Log, (op, [, positional]) => {
  op(VM_PUSH_FRAME_OP);
  SimpleArgs(op, positional, null, false);
  op(VM_LOG_OP);
  op(VM_POP_FRAME_OP);
  op(VM_FETCH_OP, $v0);
});
