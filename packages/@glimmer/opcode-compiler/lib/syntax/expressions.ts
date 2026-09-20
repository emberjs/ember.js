import type { ExpressionSexpOpcode } from '@glimmer/interfaces';
import {
  CONCAT_OP,
  GET_DYNAMIC_VAR_OP,
  GET_PROPERTY_OP,
  GET_VARIABLE_OP,
  HAS_BLOCK_OP,
  HAS_BLOCK_PARAMS_OP,
  IF_INLINE_OP,
  LOG_OP,
  NOT_OP,
  SPREAD_BLOCK_OP,
} from '@glimmer/runtime/lib/compiled/opcodes/expressions';
import {
  COMPILE_BLOCK_OP,
  CONSTANT_REFERENCE_OP,
  FETCH_OP,
} from '@glimmer/runtime/lib/compiled/opcodes/vm';
import { VM_POP_FRAME_OP, VM_PUSH_FRAME_OP } from '@glimmer/constants/lib/vm-ops';
import { $v0 } from '@glimmer/vm/lib/registers';
import { opcodes as SexpOpcodes } from '@glimmer/wire-format/lib/opcodes';

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

  op(CONCAT_OP, parts.length);
});

EXPRESSIONS.add(SexpOpcodes.Call, (op, [, expression, positional, named]) => {
  if (isGetFreeHelper(expression)) {
    op(HighLevelResolutionOpcodes.Helper, expression, (handle: number) => {
      Call(op, handle, positional, named);
    });
  } else {
    expr(op, expression);
    CallDynamic(op, positional, named);
  }
});

EXPRESSIONS.add(SexpOpcodes.Curry, (op, [, expr, type, positional, named]) => {
  Curry(op, type, expr, positional, named);
});

EXPRESSIONS.add(SexpOpcodes.GetSymbol, (op, [, sym, path]) => {
  op(GET_VARIABLE_OP, sym);
  withPath(op, path);
});

EXPRESSIONS.add(SexpOpcodes.GetLexicalSymbol, (op, [, sym, path]) => {
  op(HighLevelResolutionOpcodes.TemplateLocal, sym, (handle: number) => {
    op(CONSTANT_REFERENCE_OP, handle);
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
    op(GET_PROPERTY_OP, path[i]);
  }
}

EXPRESSIONS.add(SexpOpcodes.Undefined, (op) => PushPrimitiveReference(op, undefined));
EXPRESSIONS.add(SexpOpcodes.HasBlock, (op, [, block]) => {
  expr(op, block);
  op(HAS_BLOCK_OP);
});

EXPRESSIONS.add(SexpOpcodes.HasBlockParams, (op, [, block]) => {
  expr(op, block);
  op(SPREAD_BLOCK_OP);
  op(COMPILE_BLOCK_OP);
  op(HAS_BLOCK_PARAMS_OP);
});

EXPRESSIONS.add(SexpOpcodes.IfInline, (op, [, condition, truthy, falsy]) => {
  // Push in reverse order
  expr(op, falsy);
  expr(op, truthy);
  expr(op, condition);
  op(IF_INLINE_OP);
});

EXPRESSIONS.add(SexpOpcodes.Not, (op, [, value]) => {
  expr(op, value);
  op(NOT_OP);
});

EXPRESSIONS.add(SexpOpcodes.GetDynamicVar, (op, [, expression]) => {
  expr(op, expression);
  op(GET_DYNAMIC_VAR_OP);
});

EXPRESSIONS.add(SexpOpcodes.Log, (op, [, positional]) => {
  op(VM_PUSH_FRAME_OP);
  SimpleArgs(op, positional, null, false);
  op(LOG_OP);
  op(VM_POP_FRAME_OP);
  op(FETCH_OP, $v0);
});
